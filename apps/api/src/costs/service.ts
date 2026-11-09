import {
  activeCompare,
  addDays,
  formatPlainDate,
  type Capabilities,
  type PlainDate,
  type TariffPeriod,
} from '@p1/shared';
import type { CounterField, HouseholdDataSource } from '../data/source';
import type { CachedDay, CostCache, ProfileKey } from '../db/costs';
import type { TariffRepository } from '../db/tariffs';
import type { PriceReader } from '../prices/store';
import { zonedToUtc } from '../time';
import {
  dayCost,
  emptyBalance,
  LAST_NET_METERING_YEAR,
  type Balance,
  type DayCost,
  type DayResult,
  type DayUsage,
  type Unknown,
} from './engine';
import { dayUsages, type CounterSeries } from './usage';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Range of one Influx query; a month of quarter values per counter. */
const CHUNK_DAYS = 31;
/** Baseline lookup before the first day, as in history. */
const LONG_LOOKBACK_MS = 400 * DAY_MS;
/** A day's data is considered final this long after the day ended. */
const SETTLE_MS = 2 * HOUR_MS;

export interface DayEntry {
  date: string;
  cost: DayCost | Unknown;
}

export interface CostDays {
  own: DayEntry[];
  compare?: { name: string; days: DayEntry[] };
  /** Per-quarter results of the `detail` day, when requested (hour buckets). */
  detail?: { usage: DayUsage; results: Partial<Record<ProfileKey, DayResult>> };
}

const daysBetween = (from: PlainDate, to: PlainDate): PlainDate[] => {
  const days: PlainDate[] = [];
  for (let d = from; formatPlainDate(d) <= formatPlainDate(to); d = addDays(d, 1)) days.push(d);
  return days;
};

/** Consecutive runs of days, e.g. [1, 2, 5] → [[1, 2], [5]]. */
const runs = (days: PlainDate[]): PlainDate[][] => {
  const result: PlainDate[][] = [];
  for (const day of days) {
    const last = result.at(-1);
    const previous = last?.at(-1);
    if (last && previous && formatPlainDate(addDays(previous, 1)) === formatPlainDate(day)) {
      last.push(day);
    } else {
      result.push([day]);
    }
  }
  return result;
};

/**
 * Daily costs per tariff profile (docs/design/2026-11-09-costs.md §6.2): computed from
 * quarter-hour usage and prices, cached per tariff version. Under net metering a day depends on
 * the year so far, so a year is filled from 1 January; later requests reuse the cached days and
 * their balances.
 */
export class CostService {
  /** One computation per household at a time, so concurrent requests reuse the cache. */
  private readonly queue = new Map<string, Promise<unknown>>();

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly prices: PriceReader | undefined,
    private readonly tariffs: TariffRepository,
    private readonly cache: CostCache,
  ) {}

  /** Whether the household has any tariff period (otherwise the app shows no costs). */
  configured(signature: string): boolean {
    const profiles = this.tariffs.get(signature).profiles;
    const compare = activeCompare(profiles);
    return profiles.own.periods.length > 0 || (compare?.periods.length ?? 0) > 0;
  }

  /**
   * Costs of every day in [from, to] (local dates). With `detail` (a day in the range) that
   * day is always recomputed and its per-quarter results are returned too.
   */
  async days(
    signature: string,
    capabilities: Capabilities,
    from: PlainDate,
    to: PlainDate,
    now = Date.now(),
    detail?: PlainDate,
  ): Promise<CostDays> {
    const previous = this.queue.get(signature) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(() => this.compute(signature, capabilities, from, to, now, detail));
    this.queue.set(signature, run);
    try {
      return await run;
    } finally {
      if (this.queue.get(signature) === run) this.queue.delete(signature);
    }
  }

  private async compute(
    signature: string,
    capabilities: Capabilities,
    from: PlainDate,
    to: PlainDate,
    now: number,
    detail?: PlainDate,
  ): Promise<CostDays> {
    const stored = this.tariffs.get(signature);
    const own = stored.profiles.own;
    // A switched-off comparison contract is kept but not computed (#54).
    const compare = activeCompare(stored.profiles);
    const profiles: Array<[ProfileKey, TariffPeriod[]]> = [['own', own.periods]];
    if (compare) profiles.push(['compare', compare.periods]);

    const requested = daysBetween(from, to);
    const results = new Map<ProfileKey, Map<string, CachedDay>>();
    const anyPeriods = profiles.some(([, periods]) => periods.length > 0);
    const detailKey = detail && formatPlainDate(detail);
    let detailResult: CostDays['detail'];

    if (anyPeriods) {
      // Net metering needs the balance since 1 January.
      const start =
        from.year <= LAST_NET_METERING_YEAR ? { year: from.year, month: 1, day: 1 } : from;
      const all = daysBetween(start, to);
      const end = formatPlainDate(addDays(to, 1));
      for (const [profile] of profiles) {
        results.set(
          profile,
          this.cache.get(signature, profile, stored.version, formatPlainDate(start), end),
        );
      }
      const missing = all.filter(
        (day) =>
          formatPlainDate(day) === detailKey ||
          profiles.some(([profile]) => !results.get(profile)!.has(formatPlainDate(day))),
      );

      // Days without data are only final before the household's first data; in a gap they get
      // their share of the use once the meter reports again.
      let firstData: number | null | undefined;
      const final = async (date: PlainDate, cost: DayCost | Unknown) => {
        if (!this.isFinal(date, cost, now)) return false;
        if (cost !== 'no-usage') return true;
        firstData ??= (await this.source.firstPoint(signature))?.getTime() ?? null;
        return firstData === null || zonedToUtc(addDays(date, 1)).getTime() <= firstData;
      };

      for (const run of runs(missing)) {
        const before = formatPlainDate(addDays(run[0]!, -1));
        const startBalance: Balance =
          results.get('own')!.get(before)?.balance ?? emptyBalance(run[0]!.year);
        const usages = await this.usage(signature, capabilities, run, now);
        for (const [profile, periods] of profiles) {
          let balance = startBalance;
          const fresh: Array<{ day: string } & CachedDay> = [];
          for (const usage of usages) {
            const result = dayCost(usage, periods, balance);
            balance = result.balance;
            const day = formatPlainDate(usage.date);
            const entry = { cost: result.cost, balance };
            results.get(profile)!.set(day, entry);
            if (day === detailKey) {
              detailResult ??= { usage, results: {} };
              detailResult.results[profile] = result;
            }
            if (await final(usage.date, result.cost)) fresh.push({ day, ...entry });
          }
          this.cache.put(signature, profile, stored.version, fresh);
        }
      }
    }

    const entries = (profile: ProfileKey): DayEntry[] =>
      requested.map((day) => {
        const date = formatPlainDate(day);
        return { date, cost: results.get(profile)?.get(date)?.cost ?? 'no-tariff' };
      });
    return {
      own: entries('own'),
      ...(compare && { compare: { name: compare.name, days: entries('compare') } }),
      ...(detailResult && { detail: detailResult }),
    };
  }

  /** Whether a computed day will not change any more and may be cached. */
  private isFinal(date: PlainDate, cost: DayCost | Unknown, now: number): boolean {
    const dayEnd = zonedToUtc(addDays(date, 1)).getTime();
    if (dayEnd > now - SETTLE_MS) return false;
    return cost !== 'no-price'; // prices may still arrive (backfill)
  }

  /** Usage and prices per day for consecutive days, read in monthly chunks. */
  private async usage(
    signature: string,
    capabilities: Capabilities,
    days: PlainDate[],
    now: number,
  ): Promise<DayUsage[]> {
    const importField = capabilities.importCounter;
    const exportField: CounterField =
      importField === 'energy_consumed' ? 'energy_produced' : 'energy_consumed';
    const fields: CounterField[] = [importField];
    if (capabilities.hasExport) fields.push(exportField);
    if (capabilities.hasGas) fields.push('gas_delivered');

    const start = zonedToUtc(days[0]!);
    const baseline = await this.source.lastBefore(signature, fields, start, LONG_LOOKBACK_MS);
    const series = new Map<CounterField, CounterSeries>(
      fields.map((field) => {
        const last = baseline.get(field);
        return [
          field,
          { last: new Map(), ...(last && { baseline: last.value, baselineTime: last.time }) },
        ];
      }),
    );
    const prices = new Map<number, number>();
    const gasPrices = new Map<number, number>();

    for (let i = 0; i < days.length; i += CHUNK_DAYS) {
      const chunk = days.slice(i, i + CHUNK_DAYS);
      const from = zonedToUtc(chunk[0]!);
      const to = zonedToUtc(addDays(chunk.at(-1)!, 1));
      if (from.getTime() > now) break;
      const [counters, electricity, gas] = await Promise.all([
        this.source.quarterCounters(signature, fields, from, to),
        this.prices?.electricityPrices(from, to),
        capabilities.hasGas ? this.prices?.gasPrices(from, to) : undefined,
      ]);
      for (const [field, values] of counters) {
        const target = series.get(field)!.last;
        for (const [time, value] of values) target.set(time, value);
      }
      electricity?.forEach((price, time) => prices.set(time, price));
      gas?.forEach((price, time) => gasPrices.set(time, price));
    }

    return dayUsages({
      days,
      importSeries: series.get(importField)!,
      ...(capabilities.hasExport && { exportSeries: series.get(exportField)! }),
      ...(capabilities.hasGas && { gasSeries: series.get('gas_delivered')! }),
      prices,
      gasPrices,
      now,
    });
  }
}
