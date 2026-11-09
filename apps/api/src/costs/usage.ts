import { addDays, type PlainDate } from '@p1/shared';
import { zonedToUtc } from '../time';
import type { DayUsage, QuarterUsage } from './engine';

const QUARTER_MS = 15 * 60_000;
/**
 * Gaps up to an hour are normal (kits pause; gas meters report hourly) and spread without
 * marking the result as an estimate.
 */
const NORMAL_GAP_QUARTERS = 3;

/** Start (ms) of every quarter hour of a local day: 92, 96 or 100 on DST days. */
export function quarterStarts(date: PlainDate): number[] {
  const end = zonedToUtc(addDays(date, 1)).getTime();
  const starts: number[] = [];
  for (let t = zonedToUtc(date).getTime(); t < end; t += QUARTER_MS) starts.push(t);
  return starts;
}

export interface CounterSeries {
  /** Quarter start (ms) → last counter value in that quarter. */
  last: Map<number, number>;
  /** Last value before the first quarter, if any. */
  baseline?: number;
}

/**
 * Use per quarter hour from counter values (docs/design/2026-11-09-costs.md §3.2). Unlike the
 * history buckets, use during a gap is spread evenly over the gap's quarters (marked as
 * estimated when the gap is longer than an hour), so totals match the counters. Quarters after the last value or after `now` are
 * null (unknown); a counter going down (meter replaced) counts as 0.
 */
export function quarterDeltas(
  series: CounterSeries,
  starts: number[],
  now: number,
): { values: Array<number | null>; estimated: boolean[] } {
  const values: Array<number | null> = starts.map(() => null);
  const estimated = starts.map(() => false);
  let known = series.baseline;
  let pending: number[] = [];

  starts.forEach((start, i) => {
    if (start >= now) return;
    const value = series.last.get(start);
    if (value === undefined) {
      pending.push(i);
      return;
    }
    if (known !== undefined) {
      const delta = value - known;
      const share = Math.max(0, delta) / (pending.length + 1);
      for (const j of [...pending, i]) {
        values[j] = share;
        estimated[j] = pending.length > NORMAL_GAP_QUARTERS || delta < 0;
      }
    }
    known = value;
    pending = [];
  });
  return { values, estimated };
}

export interface UsageInput {
  days: PlainDate[];
  importSeries: CounterSeries;
  /** Absent for households without export. */
  exportSeries?: CounterSeries;
  /** Absent for households without gas. */
  gasSeries?: CounterSeries;
  /** Quarter start (ms) → day-ahead price EUR/kWh excl. VAT. */
  prices: Map<number, number>;
  /** Hour start (ms) → gas price EUR/m³ excl. VAT. */
  gasPrices: Map<number, number>;
  now: number;
}

/** Combines counters and prices into the input of the cost engine, one entry per day. */
export function dayUsages(input: UsageInput): DayUsage[] {
  const perDay = input.days.map(quarterStarts);
  const starts = perDay.flat();
  const imports = quarterDeltas(input.importSeries, starts, input.now);
  const exports = input.exportSeries && quarterDeltas(input.exportSeries, starts, input.now);
  const gas = input.gasSeries && quarterDeltas(input.gasSeries, starts, input.now);

  let offset = 0;
  return input.days.map((date, d) => {
    const dayStarts = perDay[d]!;
    const range = (i: number) => offset + i;
    let estimated = false;
    const quarters = dayStarts.map((start, i): QuarterUsage | null => {
      const k = range(i);
      const importKwh = imports.values[k];
      const exportKwh = exports ? exports.values[k] : 0;
      if (importKwh === null || importKwh === undefined || exportKwh === null) return null;
      if (imports.estimated[k] || exports?.estimated[k]) estimated = true;
      const price = input.prices.get(start);
      return { start, importKwh, exportKwh: exportKwh ?? 0, ...(price !== undefined && { price }) };
    });

    let gasM3: number | null | undefined;
    if (gas) {
      const known = dayStarts.map((_, i) => gas.values[range(i)]).filter((v) => v != null);
      gasM3 = known.length === 0 ? null : known.reduce((a, b) => a + b, 0);
      if (known.length < dayStarts.length || dayStarts.some((_, i) => gas.estimated[range(i)])) {
        estimated = true;
      }
    }
    const dayEnd = (dayStarts.at(-1) ?? 0) + QUARTER_MS;
    const hourPrices = [...input.gasPrices]
      .filter(([time]) => time >= dayStarts[0]! && time < dayEnd)
      .map(([, price]) => price);
    offset += dayStarts.length;

    return {
      date,
      quarters,
      ...(gas && { gasM3 }),
      ...(hourPrices.length > 0 && {
        gasPrice: hourPrices.reduce((a, b) => a + b, 0) / hourPrices.length,
      }),
      estimated,
    };
  });
}
