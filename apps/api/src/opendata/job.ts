import type { DatabaseSync } from 'node:sqlite';
import { REFERENCE_STATION } from '@p1/shared';
import type { FastifyBaseLogger } from 'fastify';
import { FetchError } from '../prices/job';
import {
  CBS_HEATING_CODES,
  cbsPeriodsUrl,
  cbsRowsUrl,
  parseCbsPeriods,
  parseCbsRows,
  type CbsRow,
} from './cbs';
import {
  KNMI_DAILY_URL,
  KNMI_HOURLY_URL,
  knmiDailyBody,
  knmiHourlyBody,
  parseKnmiDaily,
  parseKnmiHourly,
  type WeatherHour,
} from './knmi';
import type { DailyWeather, OpenDataStore } from './store';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Years of daily weather behind the normal year (design §2). */
export const NORMAL_YEARS = 20;
/** Hourly weather from the year the first household data arrived (August 2023). */
export const HOURLY_FROM_YEAR = 2023;
/** A normal period with fewer stored days is fetched (again). */
const FULL_NORMAL_DAYS = NORMAL_YEARS * 365 - 30;
/** A past year with fewer stored hours is fetched (again); tolerates small KNMI gaps. */
const FULL_YEAR_HOURS = 8000;
/** The current year is topped up when the newest hour is older than this … */
const STALE_AFTER_MS = 48 * HOUR_MS;
/** … but at most this often per station (KNMI publishes about a day behind). */
const RECENT_EVERY_MS = 3 * HOUR_MS;
/** Hours the current year may lack (publication delay plus a little); more means gaps. */
const MISSING_HOURS_ALLOWED = 72;
const CBS_CHECK_EVERY_MS = 30 * DAY_MS;
const RETRY_AFTER_FAILURE_MS = HOUR_MS;
const USER_AGENT = 'p1-meter-app (+https://p1-meter.sendlab.nl)';

export interface OpenDataFetchers {
  knmi(station: number, from: Date, to: Date): Promise<WeatherHour[]>;
  knmiDaily(station: number, firstYear: number, lastYear: number): Promise<DailyWeather[]>;
  cbsYears(): Promise<number[]>;
  cbsRows(year: number, heating: string): Promise<CbsRow[]>;
}

export function httpOpenDataFetchers(): OpenDataFetchers {
  const request = async (url: string, init: RequestInit = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new FetchError(res.status);
    return res.json();
  };
  return {
    knmi: async (station, from, to) =>
      parseKnmiHourly(
        await request(KNMI_HOURLY_URL, {
          method: 'POST',
          body: knmiHourlyBody(station, from, to),
        }),
      ),
    knmiDaily: async (station, firstYear, lastYear) =>
      parseKnmiDaily(
        await request(KNMI_DAILY_URL, {
          method: 'POST',
          body: knmiDailyBody(station, firstYear, lastYear),
        }),
      ),
    cbsYears: async () => parseCbsPeriods(await request(cbsPeriodsUrl())),
    cbsRows: async (year, heating) => parseCbsRows(await request(cbsRowsUrl(year, heating))),
  };
}

export type OpenDataStatus = 'pending' | 'ok' | 'backoff';

const floorHour = (date: Date) => new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
const yearStart = (year: number) => new Date(Date.UTC(year, 0, 1));

/**
 * Keeps the `open-data` bucket filled (design §6.1): per station in use 20 years of daily
 * means for the normal year (one request) and hourly weather since 2023, and every CBS year. Requests run one at a time with a pause in
 * between; a failure waits for the next run instead of retrying at once.
 */
export class OpenDataJob {
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | undefined;
  private again = false;
  private weatherStatus: OpenDataStatus = 'pending';
  private cbsStatus: OpenDataStatus = 'pending';
  private readonly lastRecent = new Map<number, number>();
  private readonly failedUntil = new Map<string, number>();
  private cbsCache: CbsRow[] | undefined;
  /** Stations whose weather was complete after the last pass. */
  private readonly complete = new Set<number>();
  /** Hears every station that received new weather (to drop caches). */
  onWeather: (station: number) => void = () => {};

  constructor(
    private readonly store: OpenDataStore,
    private readonly fetchers: OpenDataFetchers,
    private readonly db: DatabaseSync,
    private readonly log: FastifyBaseLogger,
    private readonly options: { pauseMs?: number; now?: () => Date } = {},
  ) {}

  status(): { weather: OpenDataStatus; cbs: OpenDataStatus } {
    return { weather: this.weatherStatus, cbs: this.cbsStatus };
  }

  start(intervalMs = 10 * 60_000): void {
    setTimeout(() => void this.tick(), 1_000).unref();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  /** Stations whose weather is kept: the reference station plus every station requested. */
  stations(): number[] {
    const rows = this.db
      .prepare('SELECT station FROM weather_stations ORDER BY station')
      .all() as Array<{
      station: number;
    }>;
    return [...new Set([REFERENCE_STATION, ...rows.map((r) => r.station)])];
  }

  /** Registers a station on first use and starts fetching its weather. */
  useStation(station: number): void {
    const result = this.db
      .prepare('INSERT OR IGNORE INTO weather_stations (station, added_at) VALUES (?, ?)')
      .run(station, this.now().toISOString());
    if (result.changes > 0) void this.tick();
  }

  /** Whether the station's weather is complete (false while it is still being fetched). */
  ready(station: number): boolean {
    return this.complete.has(station);
  }

  /** All stored CBS rows, loaded once and refreshed after new years arrive. */
  async cbsRows(): Promise<CbsRow[]> {
    this.cbsCache ??= await this.store.cbsRows();
    return this.cbsCache;
  }

  /** One pass; a call during a pass schedules one more pass afterwards. */
  tick(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.weather();
          await this.cbs();
          // Load the CBS rows now rather than on the first comparison (tens of thousands of
          // rows); inside the loop, so a station requested meanwhile is not left waiting.
          await this.cbsRows().catch((error: unknown) =>
            this.log.warn({ err: error }, 'loading CBS rows failed'),
          );
        } while (this.again);
      } finally {
        this.running = undefined;
      }
    })();
    return this.running;
  }

  private pause() {
    const ms = this.options.pauseMs ?? 2_000;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  /** Runs one request unless it failed less than an hour ago; false when it failed. */
  private async attempt(key: string, operation: () => Promise<void>): Promise<boolean> {
    const now = this.now().getTime();
    if ((this.failedUntil.get(key) ?? 0) > now) return false;
    try {
      await operation();
      this.failedUntil.delete(key);
      return true;
    } catch (error) {
      this.failedUntil.set(key, now + RETRY_AFTER_FAILURE_MS);
      this.log.warn({ err: error, key }, 'open data fetch failed; retrying later');
      return false;
    } finally {
      await this.pause();
    }
  }

  private async weather(): Promise<void> {
    let ok = true;
    const now = this.now();
    const currentYear = now.getUTCFullYear();
    // Stations still being filled first: someone is waiting for them.
    const stations = this.stations().sort(
      (a, b) => Number(this.complete.has(a)) - Number(this.complete.has(b)),
    );
    for (const station of stations) {
      let stationOk = true;
      let fetchedAny = false;
      try {
        // The current year first, so a new station is usable quickly; then older years.
        const [last, counts] = await Promise.all([
          this.store.lastWeatherHour(station),
          this.store.weatherHoursPerYear(station),
        ]);
        // Continue after the newest hour, unless the year so far has gaps: then refetch it.
        const elapsed = (floorHour(now).getTime() - yearStart(currentYear).getTime()) / HOUR_MS;
        const gaps = (counts.get(currentYear) ?? 0) < elapsed - MISSING_HOURS_ALLOWED;
        const from =
          last && last >= yearStart(currentYear) && !gaps ? last : yearStart(currentYear);
        // Stored data is complete: usable right away, even before topping up (e.g. after a
        // restart), so the analysis does not wait for KNMI.
        const normalStored = (
          await this.store.normalDays(station, currentYear - NORMAL_YEARS, currentYear - 1)
        ).length;
        const pastComplete =
          normalStored >= FULL_NORMAL_DAYS &&
          Array.from(
            { length: currentYear - HOURLY_FROM_YEAR },
            (_, i) => counts.get(HOURLY_FROM_YEAR + i) ?? 0,
          ).every((n) => n >= FULL_YEAR_HOURS);
        if (pastComplete && !gaps) this.complete.add(station);
        const stale = now.getTime() - from.getTime() > STALE_AFTER_MS;
        const due = now.getTime() - (this.lastRecent.get(station) ?? 0) >= RECENT_EVERY_MS;
        if (stale && due) {
          this.lastRecent.set(station, now.getTime());
          const fetched = await this.attempt(`knmi:${station}:recent`, async () => {
            const hours = await this.fetchers.knmi(station, from, floorHour(now));
            await this.store.writeWeather(station, hours);
          });
          if (fetched) fetchedAny = true;
          else stationOk = false;
        }
        if (normalStored < FULL_NORMAL_DAYS) {
          const fetched = await this.attempt(`knmi:${station}:normal`, async () => {
            const days = await this.fetchers.knmiDaily(
              station,
              currentYear - NORMAL_YEARS,
              currentYear - 1,
            );
            await this.store.writeNormalDays(station, days);
          });
          if (fetched) fetchedAny = true;
          else stationOk = false;
        }
        for (let year = currentYear - 1; year >= HOURLY_FROM_YEAR; year--) {
          if ((counts.get(year) ?? 0) >= FULL_YEAR_HOURS) continue;
          const fetched = await this.attempt(`knmi:${station}:${year}`, async () => {
            const hours = await this.fetchers.knmi(station, yearStart(year), yearStart(year + 1));
            await this.store.writeWeather(station, hours);
          });
          if (fetched) fetchedAny = true;
          else stationOk = false;
        }
      } catch (error) {
        stationOk = false;
        this.log.warn({ err: error, station }, 'weather store unavailable');
      }
      if (stationOk) this.complete.add(station);
      else ok = false;
      if (fetchedAny) this.onWeather(station);
    }
    this.weatherStatus = ok ? 'ok' : 'backoff';
  }

  private meta(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row?.value;
  }

  private async cbs(): Promise<void> {
    const now = this.now();
    const checked = this.meta('cbs_checked');
    if (checked && now.getTime() - Date.parse(checked) < CBS_CHECK_EVERY_MS) {
      if (this.cbsStatus === 'pending') this.cbsStatus = 'ok';
      return;
    }
    let ok: boolean;
    try {
      const stored = new Set(await this.store.cbsYears());
      let available: number[] = [];
      ok = await this.attempt('cbs:periods', async () => {
        available = await this.fetchers.cbsYears();
      });
      for (const year of available.filter((y) => !stored.has(y))) {
        const rows: CbsRow[] = [];
        let complete = true;
        for (const heating of CBS_HEATING_CODES) {
          complete &&= await this.attempt(`cbs:${year}:${heating}`, async () => {
            rows.push(...(await this.fetchers.cbsRows(year, heating)));
          });
        }
        // Only whole years are stored, so a missing year is retried as a whole.
        if (complete) {
          await this.store.writeCbs(rows);
          this.cbsCache = undefined;
        }
        ok &&= complete;
      }
      if (ok) {
        this.db
          .prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)')
          .run('cbs_checked', now.toISOString());
      }
    } catch (error) {
      ok = false;
      this.log.warn({ err: error }, 'CBS store unavailable');
    }
    this.cbsStatus = ok ? 'ok' : 'backoff';
  }
}
