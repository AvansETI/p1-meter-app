import type { DatabaseSync } from 'node:sqlite';
import { REFERENCE_BASE, REFERENCE_METHOD, REFERENCE_STATION, referenceAnnual } from '@p1/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { HouseholdDataSource } from '../data/source';
import type { OpenDataJob } from '../opendata/job';
import { zonedHour } from '../time';
import { dayKey } from '../usage/tracker';
import { dailyGas, mergeDays } from './days';
import { REFERENCE_MAX_AGE_DAYS } from './service';
import type { WeatherService } from './weather';

const DAY_MS = 86_400_000;
/** KNMI has published the previous day by then (design §4.2). */
const RUN_FROM_HOUR = 11;
/** Days of gas read per household: a year plus the day before. */
const WINDOW_DAYS = 367;

/**
 * Nightly reference values for the comparison (design §4.1–4.2): the weather-corrected
 * consumption of the last 365 days of every household with gas, stored under its hash.
 * Households are read one after another with a pause, to keep the load on InfluxDB low.
 */
export class ReferenceJob {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly weather: WeatherService,
    private readonly openData: OpenDataJob,
    private readonly db: DatabaseSync,
    private readonly hash: (signature: string) => string,
    private readonly log: FastifyBaseLogger,
    private readonly options: { pauseMs?: number; now?: () => Date } = {},
  ) {}

  start(intervalMs = 15 * 60_000): void {
    setTimeout(() => void this.tick(), 60_000).unref();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private lastRun(): string | undefined {
    const row = this.db
      .prepare("SELECT value FROM app_meta WHERE key = 'gas_reference_day'")
      .get() as { value: string } | undefined;
    return row?.value;
  }

  /** Runs once a day after 11:00, and right away when it never ran. */
  async tick(): Promise<void> {
    const now = this.now();
    const today = dayKey(now);
    const last = this.lastRun();
    if (last === today || (last && zonedHour(now) < RUN_FROM_HOUR)) return;
    if (!this.openData.ready(REFERENCE_STATION)) return;
    await this.run();
  }

  async run(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const now = this.now();
      const today = dayKey(now);
      const yesterday = dayKey(new Date(now.getTime() - DAY_MS));
      const from = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
      const [weather, normals] = await Promise.all([
        this.weather.daily(REFERENCE_STATION),
        this.weather.normals(REFERENCE_STATION, REFERENCE_BASE, REFERENCE_METHOD),
      ]);
      const signatures = await this.source.gasSignatures(from);
      const upsert = this.db.prepare(
        'INSERT OR REPLACE INTO gas_reference (hash, annual_m3, updated_day) VALUES (?, ?, ?)',
      );
      let stored = 0;
      for (const signature of signatures) {
        try {
          const gas = dailyGas(await this.source.gasDayEnds(signature, from));
          const first = [...gas.keys()].sort()[0];
          if (!first) continue;
          const annual = referenceAnnual(mergeDays(gas, weather, first, yesterday), normals.annual);
          if (annual !== null) {
            upsert.run(this.hash(signature), annual, today);
            stored++;
          }
        } catch (error) {
          this.log.warn({ err: error }, 'gas reference for a household failed');
        }
        await this.pause();
      }
      const stale = dayKey(new Date(now.getTime() - REFERENCE_MAX_AGE_DAYS * DAY_MS));
      this.db.prepare('DELETE FROM gas_reference WHERE updated_day < ?').run(stale);
      this.db
        .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('gas_reference_day', ?)")
        .run(today);
      this.log.info({ households: signatures.length, stored }, 'gas reference values updated');
      return stored;
    } catch (error) {
      this.log.warn({ err: error }, 'gas reference run failed');
      return 0;
    } finally {
      this.running = false;
    }
  }

  private pause() {
    const ms = this.options.pauseMs ?? 1_000;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
