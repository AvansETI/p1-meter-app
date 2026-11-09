import {
  addDays,
  bucketDates,
  periodStart,
  shiftPeriod,
  type Period,
  type PlainDate,
} from '@p1/shared';
import { zonedToUtc } from '../time';

const HOUR_MS = 3_600_000;

export interface PeriodBounds {
  start: number;
  end: number;
  /** Start of the bucket before the period: its last counter value is the baseline. */
  baselineStart: number;
  /** Start of every bucket (ms), in order. */
  bucketStarts: number[];
  /** Flux window for aggregateWindow. */
  every: '1h' | '1d' | '1mo';
}

/** Local period and bucket boundaries as UTC instants (docs/design/2026-11-09-history.md §2). */
export function periodBounds(date: PlainDate, period: Period): PeriodBounds {
  const first = periodStart(date, period);
  const start = zonedToUtc(first).getTime();
  const end = zonedToUtc(shiftPeriod(first, period, 1)).getTime();
  if (period === 'day') {
    // Hours are absolute, so a DST day automatically has 23 or 25 buckets.
    const bucketStarts: number[] = [];
    for (let t = start; t < end; t += HOUR_MS) bucketStarts.push(t);
    return { start, end, baselineStart: start - HOUR_MS, bucketStarts, every: '1h' };
  }
  const bucketStarts = bucketDates(first, period).map((d) => zonedToUtc(d).getTime());
  const before = period === 'year' ? shiftPeriod(first, 'month', -1) : addDays(first, -1);
  return {
    start,
    end,
    baselineStart: zonedToUtc(before).getTime(),
    bucketStarts,
    every: period === 'year' ? '1mo' : '1d',
  };
}

export interface BucketDelta {
  start: number;
  value: number | null;
  /** Set when the value includes use during a gap; the gap began with this bucket start. */
  gapStart?: number;
}

/**
 * Use per bucket from the last counter value of each bucket (architecture §7.4):
 * empty bucket → null; first bucket after empty ones → whole delta marked with `gapStart`;
 * negative delta (counter replaced) → null; buckets after `now` → null without marking.
 * `last` maps a bucket start to the last counter value in it, including the baseline bucket
 * and possibly older ones (used when the baseline bucket itself is empty).
 */
export function bucketDeltas(
  last: Map<number, number>,
  bucketStarts: number[],
  baselineStart: number,
  now: number,
): BucketDelta[] {
  const all = [baselineStart, ...bucketStarts];
  let known: { index: number; value: number } | undefined;
  // Baseline: the newest value at or before the baseline bucket (index -1 = older than that).
  for (const [start, value] of last) {
    if (start > baselineStart) continue;
    const index = start === baselineStart ? 0 : -1;
    if (!known || index > known.index || (index === known.index && start > baselineStart)) {
      known = { index, value };
    }
  }

  return bucketStarts.map((start, i) => {
    const index = i + 1;
    if (start > now) return { start, value: null };
    const value = last.get(start);
    if (value === undefined) return { start, value: null };
    const previous = known;
    known = { index, value };
    if (!previous) return { start, value: null }; // no baseline to subtract from
    const delta = value - previous.value;
    if (delta < 0) return { start, value: null };
    const result: BucketDelta = { start, value: round(delta) };
    if (previous.index < index - 1) {
      // Gap: the use since the bucket after the last known value is not broken down.
      result.gapStart = all[previous.index + 1] ?? baselineStart;
    }
    return result;
  });
}

const round = (value: number) => Math.round(value * 1000) / 1000;
