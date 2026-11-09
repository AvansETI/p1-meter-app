import {
  addDays,
  formatPlainDate,
  periodStart,
  shiftPeriod,
  type Capabilities,
  type CostsToday,
  type CostTotals,
  type ForecastBasis,
  type HistoryCosts,
  type Period,
  type PlainDate,
  type ProfileCost,
} from '@p1/shared';
import type { ProfileKey } from '../db/costs';
import { periodBounds } from '../history/buckets';
import { zonedDate, zonedToUtc } from '../time';
import type { DayCost, DayResult, DayUsage, Unknown } from './engine';
import type { CostDays, CostService, DayEntry } from './service';

const HOUR_MS = 3_600_000;
const round = (value: number) => Math.round(value * 10_000) / 10_000;
const key = formatPlainDate;
const earlier = (a: PlainDate, b: PlainDate) => (key(a) <= key(b) ? a : b);

/** Fraction of a local day that has passed at `now` (0–1). */
function dayFraction(date: PlainDate, now: number): number {
  const start = zonedToUtc(date).getTime();
  const end = zonedToUtc(addDays(date, 1)).getTime();
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** A day's costs with fixed costs and tax reduction for only `fraction` of the day. */
function partial(cost: DayCost, fraction: number): DayCost {
  const fixedEur = cost.fixedEur * fraction;
  const taxReductionEur = cost.taxReductionEur * fraction;
  return {
    ...cost,
    fixedEur,
    taxReductionEur,
    totalEur: cost.electricityEur + cost.gasEur + fixedEur - taxReductionEur,
  };
}

export function toProfileCost(cost: DayCost | Unknown): ProfileCost {
  if (typeof cost === 'string') return { unknown: cost };
  return {
    totalEur: round(cost.totalEur),
    electricityEur: round(cost.electricityEur),
    gasEur: round(cost.gasEur),
    fixedEur: round(cost.fixedEur),
    taxReductionEur: round(cost.taxReductionEur),
    estimated: cost.estimated,
  };
}

interface Value {
  eur: number | null;
  estimated: boolean;
}

/** Day totals per date (the current day pro rata), for one contract. */
function dayValues(entries: DayEntry[], now: number): Map<string, Value> {
  return new Map(
    entries.map(({ date, cost }): [string, Value] => {
      if (typeof cost === 'string') return [date, { eur: null, estimated: false }];
      const fraction = dayFraction(parseKey(date), now);
      return [date, { eur: round(partial(cost, fraction).totalEur), estimated: cost.estimated }];
    }),
  );
}

function parseKey(date: string): PlainDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

/** Sum of known values; null when none is known. */
function sum(values: Value[]): Value {
  const known = values.filter((v) => v.eur !== null);
  return {
    eur: known.length === 0 ? null : round(known.reduce((a, v) => a + v.eur!, 0)),
    estimated: values.some((v) => v.estimated),
  };
}

/** Hour buckets of one day from the per-quarter results (design §7.1). */
function hourValues(
  usage: DayUsage,
  result: DayResult | undefined,
  hourStarts: number[],
  now: number,
): Value[] {
  const cost = result?.cost;
  if (!result || !cost || typeof cost === 'string') {
    return hourStarts.map(() => ({ eur: null, estimated: false }));
  }
  const unitGas = usage.gasM3 ? cost.gasEur / usage.gasM3 : 0;
  const fixedPerHour = (cost.fixedEur - cost.taxReductionEur) / hourStarts.length;
  return hourStarts.map((start) => {
    if (start >= now) return { eur: null, estimated: false };
    let eur = fixedPerHour;
    usage.quarters.forEach((q, i) => {
      const quarterStart = q?.start ?? zonedToUtc(usage.date).getTime() + i * 15 * 60_000;
      if (quarterStart < start || quarterStart >= start + HOUR_MS) return;
      eur += result.quarterEur[i] ?? 0;
      eur += (usage.gasQuarters?.[i] ?? 0) * unitGas;
    });
    return { eur: round(eur), estimated: cost.estimated };
  });
}

/** The same calendar day a year earlier (29 February → 28 February). */
function lastYear(date: PlainDate): PlainDate {
  const day = date.month === 2 && date.day === 29 ? 28 : date.day;
  return { year: date.year - 1, month: date.month, day };
}

const profilesOf = (days: CostDays): Array<[ProfileKey, DayEntry[]]> => [
  ['own', days.own],
  ...(days.compare ? [['compare', days.compare.days] as [ProfileKey, DayEntry[]]] : []),
];

/**
 * Costs as shown in the app (docs/design/2026-11-09-costs.md §7.1): today so far, history
 * buckets with totals and comparison, and the forecast of the current month or year.
 */
export class CostViews {
  constructor(private readonly costs: CostService) {}

  async today(
    signature: string,
    capabilities: Capabilities,
    now = Date.now(),
  ): Promise<CostsToday> {
    if (!this.costs.configured(signature)) return { configured: false };
    const date = zonedDate(new Date(now));
    const days = await this.costs.days(signature, capabilities, date, date, now);
    const fraction = dayFraction(date, now);
    const cost = (entry: DayEntry | undefined) => {
      const value = entry?.cost ?? 'no-tariff';
      return toProfileCost(typeof value === 'string' ? value : partial(value, fraction));
    };
    return {
      configured: true,
      own: cost(days.own[0]),
      ...(days.compare && {
        compare: { name: days.compare.name, cost: cost(days.compare.days[0]) },
      }),
    };
  }

  async history(
    signature: string,
    capabilities: Capabilities,
    period: Period,
    date: PlainDate,
    now = Date.now(),
  ): Promise<HistoryCosts | undefined> {
    if (!this.costs.configured(signature)) return undefined;
    const first = periodStart(date, period);
    const bounds = periodBounds(first, period);
    const last = addDays(shiftPeriod(first, period, 1), -1);
    const today = zonedDate(new Date(now));
    const days = await this.costs.days(
      signature,
      capabilities,
      first,
      earlier(last, today),
      now,
      period === 'day' ? first : undefined,
    );

    const buckets = new Map<ProfileKey, Value[]>();
    for (const [profile, entries] of profilesOf(days)) {
      const values = dayValues(entries, now);
      const none: Value = { eur: null, estimated: false };
      let list: Value[];
      if (period === 'day') {
        const detail = days.detail;
        list = detail
          ? hourValues(detail.usage, detail.results[profile], bounds.bucketStarts, now)
          : bounds.bucketStarts.map(() => none);
      } else if (period === 'year') {
        list = bounds.bucketStarts.map((start) => {
          const month = zonedDate(new Date(start));
          return sum(
            [...values].filter(([d]) => d.startsWith(key(month).slice(0, 8))).map(([, v]) => v),
          );
        });
      } else {
        list = bounds.bucketStarts.map(
          (start) => values.get(key(zonedDate(new Date(start)))) ?? none,
        );
      }
      buckets.set(profile, list);
    }

    const own = buckets.get('own')!;
    const compare = buckets.get('compare');
    const isPast = (i: number) => bounds.bucketStarts[i]! < now;
    const totals: CostTotals = {
      own: sum(own).eur,
      ...(compare && { compare: sum(compare).eur }),
      complete: own.every((v, i) => !isPast(i) || v.eur !== null),
    };

    const isCurrent = now < bounds.end;
    return {
      ...(days.compare && { compareName: days.compare.name }),
      buckets: own.map((v, i) => ({
        own: v.eur,
        ...(compare && { compare: compare[i]?.eur ?? null }),
        ...((v.estimated || compare?.[i]?.estimated) && { estimated: true as const }),
      })),
      totals,
      previous: await this.previous(signature, capabilities, period, first, bounds, now),
      ...(isCurrent &&
        (period === 'month' || period === 'year') && {
          forecast: await this.forecast(signature, capabilities, last, totals, now),
        }),
    };
  }

  /** Totals of the previous period; for the current period only its elapsed part. */
  private async previous(
    signature: string,
    capabilities: Capabilities,
    period: Period,
    first: PlainDate,
    bounds: { start: number; end: number },
    now: number,
  ): Promise<CostTotals | null> {
    const prevFirst = shiftPeriod(first, period, -1);
    const prev = periodBounds(prevFirst, period);
    const cutoff = now < bounds.end ? prev.start + Math.max(0, now - bounds.start) : prev.end;
    const lastDay = zonedDate(new Date(cutoff - 1));
    const days = await this.costs.days(signature, capabilities, prevFirst, lastDay, now);

    const total = (entries: DayEntry[]) => {
      let eur: number | null = null;
      let complete = true;
      for (const { date, cost } of entries) {
        const day = parseKey(date);
        const start = zonedToUtc(day).getTime();
        const end = zonedToUtc(addDays(day, 1)).getTime();
        if (typeof cost === 'string') {
          complete = false;
          continue;
        }
        const share = Math.min(1, (cutoff - start) / (end - start));
        eur = (eur ?? 0) + cost.totalEur * share;
      }
      return { eur: eur === null ? null : round(eur), complete };
    };
    const own = total(days.own);
    if (own.eur === null) return null;
    const compare = days.compare && total(days.compare.days);
    return {
      own: own.eur,
      ...(compare && { compare: compare.eur }),
      complete: own.complete,
    };
  }

  /**
   * Costs so far plus the expected rest of the period (§6.3): per remaining day the cost of the
   * same day last year when known, otherwise the average of the last 30 known days.
   */
  private async forecast(
    signature: string,
    capabilities: Capabilities,
    last: PlainDate,
    totals: CostTotals,
    now: number,
  ): Promise<HistoryCosts['forecast']> {
    const today = zonedDate(new Date(now));
    const fraction = dayFraction(today, now);
    const [previousYear, recent] = await Promise.all([
      this.costs.days(signature, capabilities, lastYear(today), lastYear(last), now),
      this.costs.days(signature, capabilities, addDays(today, -30), addDays(today, -1), now),
    ]);
    const lastYearOf = new Map(
      profilesOf(previousYear).map(([profile, entries]) => [
        profile,
        new Map(entries.map((e) => [e.date, e.cost])),
      ]),
    );

    let fromLastYear = 0;
    let fromAverage = 0;
    const rest = (profile: ProfileKey, entries: DayEntry[], actual: number | null) => {
      const known = entries.flatMap((e) => (typeof e.cost === 'string' ? [] : [e.cost.totalEur]));
      const average = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : null;
      if (actual === null) return null;
      let eur = actual;
      for (let d = today; key(d) <= key(last); d = addDays(d, 1)) {
        const weight = key(d) === key(today) ? 1 - fraction : 1;
        const before = lastYearOf.get(profile)?.get(key(lastYear(d)));
        if (before !== undefined && typeof before !== 'string') {
          eur += before.totalEur * weight;
          if (profile === 'own') fromLastYear++;
        } else if (average !== null) {
          eur += average * weight;
          if (profile === 'own') fromAverage++;
        } else {
          return null;
        }
      }
      return round(eur);
    };

    const own = rest('own', recent.own, totals.own);
    const compare = recent.compare && rest('compare', recent.compare.days, totals.compare ?? null);
    const basis: ForecastBasis =
      fromAverage === 0 ? 'last-year' : fromLastYear === 0 ? 'last-30-days' : 'mixed';
    return { own, ...(recent.compare && { compare: compare ?? null }), basis };
  }
}
