import type { DatabaseSync } from 'node:sqlite';
import {
  autoBaseline,
  CALENDAR_START,
  expectedSoFar,
  formatYearStart,
  HEATING_START,
  parseYearStart,
  type YearStart,
  autoBaselineByMonth,
  chooseBaseline,
  degreeDaysToDate,
  cbsKey,
  forecastYear,
  GasProfileSchema,
  groupCandidates,
  heatingLine,
  matchesGroup,
  MIN_GROUP_SIZE,
  percentileRank,
  periods,
  quantile,
  rateDays,
  REFERENCE_BASE,
  REFERENCE_METHOD,
  REFERENCE_STATION,
  referenceAnnual,
  RECENT_DAYS,
  rollingCorrected,
  stationForPostcode,
  temperatureCurve,
  dayProfile,
  yearSummaries,
  type Distribution,
  type GasAnalysis,
  type GasAnalysisQuerySchema,
  type GasComparison,
  type GasHourly,
  type GasHourSample,
  type GasProfile,
  GasSharedSettingsSchema,
  type GasSettingsResponse,
  type GasSharedSettings,
} from '@p1/shared';
import { LRUCache } from 'lru-cache';
import type { z } from 'zod';
import type { GasDayEnd, HouseholdDataSource } from '../data/source';
import type { TariffRepository } from '../db/tariffs';
import { detectHourlyUpdates } from '../live/gas';
import type { CbsRow } from '../opendata/cbs';
import type { OpenDataJob } from '../opendata/job';
import type { OpenDataStore } from '../opendata/store';
import { zonedHour } from '../time';
import { dayKey } from '../usage/tracker';
import { dailyGas, mergeDays, readDayEnds } from './days';
import type { WeatherService } from './weather';

type AnalysisQuery = z.output<typeof GasAnalysisQuerySchema>;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const GAS_CACHE_MS = 60 * 60_000;
/** Hourly analysis window (design §3.6). */
export const HOURLY_DAYS = 90;
/** Reference values older than this belong to households that stopped sending data. */
export const REFERENCE_MAX_AGE_DAYS = 7;

const r = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
const round10 = (value: number) => Math.round(value / 10) * 10;

/** Aggregates only: rounded quantiles and the household's percentile (design §4.2). */
export function distribution(values: number[], own: number | null): Distribution | null {
  if (values.length < MIN_GROUP_SIZE) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    percentile: own === null ? null : Math.round(percentileRank(sorted, own) / 5) * 5,
    p10: round10(quantile(sorted, 0.1)),
    p25: round10(quantile(sorted, 0.25)),
    p50: round10(quantile(sorted, 0.5)),
    p75: round10(quantile(sorted, 0.75)),
    p90: round10(quantile(sorted, 0.9)),
  };
}

export class GasService {
  /** Daily readings per household; the full history once, then only the newest days. */
  private readonly endsCache = new LRUCache<string, { ends: GasDayEnd[]; at: number }>({
    max: 500,
  });

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly weather: WeatherService,
    private readonly store: OpenDataStore,
    private readonly job: OpenDataJob,
    private readonly db: DatabaseSync,
    private readonly hash: (signature: string) => string,
    private readonly now: () => Date = () => new Date(),
    /** For the contract start of contract years (§11.1). */
    private readonly tariffs?: TariffRepository,
  ) {}

  /**
   * Gas per local day over all data of the household. A year of readings takes seconds to
   * aggregate, so the daily readings are kept in the database and only the newest days are
   * read again: after the first time (or a restart) this takes well under a second.
   */
  async gasDays(signature: string): Promise<Map<string, number>> {
    const now = this.now().getTime();
    const hash = this.hash(signature);
    const cached = this.endsCache.get(hash);
    if (cached && now - cached.at < GAS_CACHE_MS) return dailyGas(cached.ends);
    const stored = cached?.ends ?? this.storedEnds(hash);
    let fresh: GasDayEnd[];
    let from: number;
    if (stored.length) {
      // Re-read the last two days: the latest one was still running.
      from = stored.at(-1)!.dayEnd - 2 * DAY_MS;
      fresh = await readDayEnds(this.source, signature, new Date(from), this.now());
    } else {
      const first = await this.source.firstPoint(signature);
      from = first ? first.getTime() - DAY_MS : now;
      fresh = first ? await readDayEnds(this.source, signature, new Date(from), this.now()) : [];
    }
    this.storeEnds(hash, fresh);
    const ends = [...stored.filter((e) => e.dayEnd <= from), ...fresh];
    this.endsCache.set(hash, { ends, at: now });
    return dailyGas(ends);
  }

  /**
   * Gas per day since `from` for the nightly comparison: from the stored history when this
   * household uses the app, else only that window, read without storing it.
   */
  async recentGasDays(signature: string, from: Date): Promise<Map<string, number>> {
    const hash = this.hash(signature);
    const stored =
      this.endsCache.has(hash) ||
      this.db.prepare('SELECT 1 FROM gas_day_ends WHERE hash = ? LIMIT 1').get(hash);
    if (stored) return this.gasDays(signature);
    return dailyGas(await readDayEnds(this.source, signature, from, this.now()));
  }

  private storedEnds(hash: string): GasDayEnd[] {
    const rows = this.db
      .prepare('SELECT day, time, day_end, value FROM gas_day_ends WHERE hash = ? ORDER BY day')
      .all(hash) as Array<{ day: string; time: number; day_end: number; value: number }>;
    return rows.map((r) => ({ day: r.day, time: r.time, dayEnd: r.day_end, value: r.value }));
  }

  private storeEnds(hash: string, ends: GasDayEnd[]): void {
    const upsert = this.db.prepare(
      'INSERT OR REPLACE INTO gas_day_ends (hash, day, time, day_end, value) VALUES (?, ?, ?, ?, ?)',
    );
    this.transaction(() => {
      for (const e of ends) upsert.run(hash, e.day, e.time, e.dayEnd, e.value);
    });
  }

  /** Remembers (or forgets) the household's postcode region for its own station. */
  setPostcode(signature: string, postcode: string | undefined): void {
    const hash = this.hash(signature);
    if (postcode) {
      this.db
        .prepare(
          'INSERT OR REPLACE INTO gas_locations (hash, postcode, updated_at) VALUES (?, ?, ?)',
        )
        .run(hash, postcode, this.now().toISOString());
    } else {
      this.db.prepare('DELETE FROM gas_locations WHERE hash = ?').run(hash);
    }
  }

  /** The station nearest to the household's stored postcode region, if any. */
  stationOf(signature: string): number | undefined {
    const row = this.db
      .prepare('SELECT postcode FROM gas_locations WHERE hash = ?')
      .get(this.hash(signature)) as { postcode: string } | undefined;
    return row ? stationForPostcode(row.postcode)?.code : undefined;
  }

  /**
   * First day of a year in the requested division (design §11.1). Contract years start on the
   * given date, else on the day and month of the newest own tariff period with a gas tariff,
   * else on 1 January.
   */
  private yearStart(signature: string, query: AnalysisQuery): YearStart {
    if (query.years === 'heating') return HEATING_START;
    if (query.years !== 'contract') return CALENDAR_START;
    const given = query.contractStart ? parseYearStart(query.contractStart) : null;
    if (given) return given;
    const periods = this.tariffs?.get(signature).profiles.own.periods ?? [];
    const latest = periods.filter((p) => p.gas).at(-1);
    return (latest && parseYearStart(latest.validFrom)) ?? CALENDAR_START;
  }

  async analysis(signature: string, query: AnalysisQuery): Promise<GasAnalysis> {
    this.job.useStation(query.station);
    this.setPostcode(signature, query.postcode);
    const [gas, weather, normals] = await Promise.all([
      this.gasDays(signature),
      this.weather.daily(query.station),
      this.weather.normals(query.station, query.base, query.method),
    ]);
    const today = dayKey(this.now());
    const gasDays = [...gas.keys()].sort();
    const weatherDays = [...weather.keys()].sort();
    const weatherUntil = weatherDays.at(-1) ?? null;
    const first = gasDays[0];
    // Up to yesterday: today is not complete.
    const yesterday = dayKey(new Date(this.now().getTime() - DAY_MS));
    const days = first ? mergeDays(gas, weather, first, yesterday) : [];

    const rated = rateDays(days, query.base, query.method);
    const auto = autoBaseline(days, query.base);
    const line = heatingLine(rated);
    const baseline = chooseBaseline({
      cooking: query.cooking,
      manual: query.baseline,
      auto,
      line,
    });
    // An automatic baseline follows the months (over the 12 months before); a manual one, or
    // none, holds for all time.
    const byMonth = autoBaselineByMonth(days, query.base);
    const automatic = baseline.source === 'auto' || baseline.source === 'line';
    const baselineIn = (month: string) =>
      automatic ? (byMonth.get(month) ?? baseline.value) : baseline.value;
    const baselineOf = (day: string) => baselineIn(day.slice(0, 7));
    const currentBaseline = baselineIn(yesterday.slice(0, 7));
    const roundPeriod = (p: ReturnType<typeof periods>[number]) => ({
      ...p,
      m3: r(p.m3, 2),
      dd: r(p.dd, 1),
      perDd: p.perDd === null ? null : r(p.perDd, 4),
    });
    const start = this.yearStart(signature, query);
    const forecast = forecastYear(rated, today, currentBaseline, line, normals, start);
    const degreeDays = degreeDaysToDate(rated, today, normals, start);
    const soFar =
      query.expected === undefined
        ? null
        : expectedSoFar(rated, today, currentBaseline, query.expected, normals.annual, start);
    const rolling = rollingCorrected(rated, currentBaseline, normals.annual);
    const yearBefore = `${Number(yesterday.slice(0, 4)) - 1}${yesterday.slice(4, 7)}`;
    const before = rollingCorrected(rated, baselineIn(yearBefore), normals.annual, RECENT_DAYS);
    return {
      station: query.station,
      pending: !this.job.ready(query.station),
      weatherUntil,
      days: rated.map((d) => ({
        day: d.day,
        m3: d.m3,
        t: d.t === null ? null : r(d.t, 1),
        dd: d.dd === null ? null : r(d.dd, 2),
      })),
      baseline: {
        value: r(currentBaseline, 3),
        auto: auto === null ? null : r(auto, 3),
        source: baseline.source,
      },
      line: line && {
        slope: r(line.slope, 4),
        intercept: r(line.intercept, 3),
        r2: r(line.r2, 3),
        n: line.n,
      },
      periods: {
        week: periods(rated, baselineOf, 'week').map(roundPeriod),
        month: periods(rated, baselineOf, 'month').map(roundPeriod),
        year: periods(rated, baselineOf, 'year', start).map(roundPeriod),
      },
      yearStart: formatYearStart(start),
      years: yearSummaries(rated, baselineOf, normals.annual, start).map((y) => ({
        ...y,
        baseline: r(y.baseline, 3),
        ddYear: r(y.ddYear, 1),
        m3: r(y.m3, 1),
        dd: r(y.dd, 1),
        corrected: y.corrected === null ? null : r(y.corrected, 0),
      })),
      forecast: forecast && {
        year: forecast.year,
        label: forecast.label,
        actual: r(forecast.actual, 0),
        estimated: r(forecast.estimated, 0),
        total: r(forecast.total, 0),
      },
      settlement:
        query.expected === undefined
          ? null
          : {
              expected: query.expected,
              forecast: forecast && r(forecast.total, 0),
              soFar: soFar && {
                actual: r(soFar.actual, 0),
                expected: r(soFar.expected, 0),
                days: soFar.days,
              },
            },
      normal: { annual: r(normals.annual, 0), years: normals.years },
      rolling: rolling && {
        corrected: r(rolling.corrected, 0),
        days: rolling.days,
        previous: before && r(before.corrected, 0),
      },
      degreeDays: degreeDays && {
        year: degreeDays.year,
        label: degreeDays.label,
        actual: r(degreeDays.actual, 0),
        normal: r(degreeDays.normal, 0),
      },
    };
  }

  async hourly(signature: string, station: number): Promise<GasHourly> {
    this.job.useStation(station);
    const now = this.now();
    const from = new Date(now.getTime() - HOURLY_DAYS * DAY_MS);
    const [gas, temperatures, weather] = await Promise.all([
      this.source.gasHourly(signature, new Date(from.getTime() - HOUR_MS)),
      this.store.hourlyTemperature(station, new Date(from.getTime() - HOUR_MS), now),
      this.weather.daily(station),
    ]);
    const hourlyUpdates = detectHourlyUpdates(gas.increaseTimes);
    const samples: GasHourSample[] = [];
    for (const [hour, value] of gas.lastPerHour) {
      const before = gas.lastPerHour.get(hour - HOUR_MS);
      if (before === undefined || hour < from.getTime()) continue;
      const m3 = value - before;
      if (m3 < 0 || m3 > 10) continue;
      // Hourly meters raise the counter just after the hour: the use belongs to the hour before.
      const start = hourlyUpdates ? hour - HOUR_MS : hour;
      const t = temperatures.get(start);
      if (t === undefined) continue;
      samples.push({
        hour: zonedHour(new Date(start)),
        m3,
        t,
        dayT: weather.get(dayKey(new Date(start)))?.t ?? null,
      });
    }
    const round = (v: number | null) => (v === null ? null : r(v, 4));
    const cold = dayProfile(samples, 'cold');
    const mild = dayProfile(samples, 'mild');
    return {
      pending: !this.job.ready(station),
      from: dayKey(from),
      to: dayKey(now),
      hourlyUpdates,
      curve: temperatureCurve(samples).map((b) => ({ ...b, m3: r(b.m3, 4) })),
      profiles: { cold: cold && cold.map(round), mild: mild && mild.map(round) },
    };
  }

  private references(): Map<string, number> {
    const since = dayKey(new Date(this.now().getTime() - REFERENCE_MAX_AGE_DAYS * DAY_MS));
    const rows = this.db
      .prepare('SELECT hash, annual_m3 FROM gas_reference WHERE updated_day >= ?')
      .all(since) as Array<{ hash: string; annual_m3: number }>;
    return new Map(rows.map((row) => [row.hash, row.annual_m3]));
  }

  private sharedProfiles(): Map<string, GasProfile> {
    const rows = this.db.prepare('SELECT hash, profile FROM gas_profiles').all() as Array<{
      hash: string;
      profile: string;
    }>;
    return new Map(
      rows.flatMap((row) => {
        const parsed = GasProfileSchema.safeParse(JSON.parse(row.profile));
        return parsed.success ? [[row.hash, parsed.data] as const] : [];
      }),
    );
  }

  /**
   * Computes and stores the household's reference value (design §4.1) with its own station
   * when its postcode is known and that weather is complete, else De Bilt. False when the
   * household has too little data.
   */
  async updateReference(signature: string, from: Date): Promise<boolean> {
    const own = this.stationOf(signature);
    const station = own !== undefined && this.job.ready(own) ? own : REFERENCE_STATION;
    const [gas, weather, normals] = await Promise.all([
      this.recentGasDays(signature, from),
      this.weather.daily(station),
      this.weather.normals(station, REFERENCE_BASE, REFERENCE_METHOD),
    ]);
    const first = [...gas.keys()].sort()[0];
    if (!first) return false;
    const yesterday = dayKey(new Date(this.now().getTime() - DAY_MS));
    const annual = referenceAnnual(mergeDays(gas, weather, first, yesterday), normals.annual);
    if (annual === null) return false;
    this.db
      .prepare(
        'INSERT OR REPLACE INTO gas_reference (hash, annual_m3, updated_day) VALUES (?, ?, ?)',
      )
      .run(this.hash(signature), annual, dayKey(this.now()));
    return true;
  }

  async comparison(signature: string, profile: GasProfile): Promise<GasComparison> {
    const hash = this.hash(signature);
    let references = this.references();
    // Not computed yet (new household, or the nightly run has not reached it): do it now.
    if (!references.has(hash)) {
      await this.updateReference(signature, new Date(this.now().getTime() - 367 * DAY_MS));
      references = this.references();
    }
    const own = references.get(hash) ?? null;
    const profiles = this.sharedProfiles();
    const ownShared = profiles.get(hash);

    let group: GasComparison['group'] = null;
    if (ownShared) {
      for (const candidate of groupCandidates(ownShared)) {
        const values = [...profiles]
          .filter(([h, p]) => references.has(h) && matchesGroup(p, candidate))
          .map(([h]) => references.get(h)!);
        const result = distribution(values, own);
        if (result) {
          group = { ...result, profile: candidate };
          break;
        }
      }
    }

    return {
      own: own === null ? null : Math.round(own),
      shared: ownShared !== undefined,
      all: distribution([...references.values()], own),
      group,
      cbs: this.cbs(await this.job.cbsRows(), profile),
    };
  }

  /** CBS figures for the profile, broadening it until CBS publishes a row (design §4.4). */
  private cbs(rows: CbsRow[], profile: GasProfile): GasComparison['cbs'] {
    const year = Math.max(...rows.map((row) => row.year));
    if (!Number.isFinite(year)) return null;
    const same = (a: CbsRow, key: ReturnType<typeof cbsKey>) =>
      a.type === key.type &&
      a.area === key.area &&
      a.period === key.period &&
      a.residents === key.residents &&
      a.heating === key.heating;
    for (const candidate of [...groupCandidates(profile), {}]) {
      const key = cbsKey(candidate);
      const latest = rows.find((row) => row.year === year && same(row, key));
      if (!latest) continue;
      return {
        year,
        profile: candidate,
        perDwelling: latest.perDwelling,
        perM2: latest.perM2,
        medians: rows
          .filter((row) => same(row, key))
          .map((row) => ({ year: row.year, p50: row.perDwelling.p50 }))
          .sort((a, b) => a.year - b.year),
      };
    }
    return null;
  }

  /** The household's shared settings, or null when no device has saved them yet. */
  settings(signature: string): GasSettingsResponse {
    const row = this.db
      .prepare('SELECT settings, updated_at FROM gas_settings WHERE hash = ?')
      .get(this.hash(signature)) as { settings: string; updated_at: string } | undefined;
    const parsed = row && GasSharedSettingsSchema.safeParse(JSON.parse(row.settings));
    return row && parsed?.success
      ? { settings: parsed.data, updatedAt: row.updated_at }
      : { settings: null, updatedAt: null };
  }

  /**
   * Stores the settings (last write wins) with the postcode and the shared profile in one
   * transaction, so the three never drift apart (shared settings design §3).
   */
  saveSettings(signature: string, settings: GasSharedSettings): string {
    const hash = this.hash(signature);
    const at = this.now().toISOString();
    this.transaction(() => {
      this.db
        .prepare(
          'INSERT OR REPLACE INTO gas_settings (hash, settings, updated_at) VALUES (?, ?, ?)',
        )
        .run(hash, JSON.stringify(settings), at);
      this.setPostcode(signature, settings.postcode);
      if (settings.share) this.shareProfile(signature, settings.profile);
      else this.unshareProfile(signature);
    });
    return at;
  }

  /** Legacy profile endpoints (removed after 0.13): keep the stored settings in step. */
  setSharedProfile(signature: string, profile: GasProfile | null): void {
    this.transaction(() => {
      if (profile) this.shareProfile(signature, profile);
      else this.unshareProfile(signature);
      const current = this.settings(signature).settings;
      if (current) {
        const next = profile ? { ...current, profile, share: true } : { ...current, share: false };
        this.db
          .prepare('UPDATE gas_settings SET settings = ?, updated_at = ? WHERE hash = ?')
          .run(JSON.stringify(next), this.now().toISOString(), this.hash(signature));
      }
    });
  }

  shareProfile(signature: string, profile: GasProfile): void {
    this.db
      .prepare('INSERT OR REPLACE INTO gas_profiles (hash, profile, updated_at) VALUES (?, ?, ?)')
      .run(this.hash(signature), JSON.stringify(profile), this.now().toISOString());
  }

  unshareProfile(signature: string): void {
    this.db.prepare('DELETE FROM gas_profiles WHERE hash = ?').run(this.hash(signature));
  }

  private transaction(work: () => void): void {
    this.db.exec('BEGIN');
    try {
      work();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
