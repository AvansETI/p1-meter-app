import { parsePlainDate, type PlainDate } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { bucketDeltas, periodBounds } from './buckets';

const d = (value: string) => parsePlainDate(value) as PlainDate;
const iso = (ms: number) => new Date(ms).toISOString();

describe('periodBounds', () => {
  it('has 24 hourly buckets on a normal day, starting at local midnight', () => {
    const b = periodBounds(d('2026-11-09'), 'day');
    expect(b.bucketStarts).toHaveLength(24);
    expect(iso(b.start)).toBe('2026-11-08T23:00:00.000Z');
    expect(iso(b.baselineStart)).toBe('2026-11-08T22:00:00.000Z');
  });

  it('has 23 and 25 hours on DST days', () => {
    expect(periodBounds(d('2026-03-29'), 'day').bucketStarts).toHaveLength(23);
    expect(periodBounds(d('2026-10-25'), 'day').bucketStarts).toHaveLength(25);
  });

  it('uses local midnights for week and month buckets, across DST', () => {
    const week = periodBounds(d('2026-10-28'), 'week');
    expect(week.bucketStarts.map(iso)).toEqual([
      '2026-10-25T23:00:00.000Z', // Mon 26 Oct: CEST ended on Sunday 03:00, so UTC+1
      '2026-10-26T23:00:00.000Z',
      '2026-10-27T23:00:00.000Z',
      '2026-10-28T23:00:00.000Z',
      '2026-10-29T23:00:00.000Z',
      '2026-10-30T23:00:00.000Z',
      '2026-10-31T23:00:00.000Z',
    ]);
    expect(iso(week.baselineStart)).toBe('2026-10-24T22:00:00.000Z');
    expect(periodBounds(d('2026-02-14'), 'month').bucketStarts).toHaveLength(28);
  });

  it('uses months for a year with the previous December as baseline', () => {
    const year = periodBounds(d('2026-06-01'), 'year');
    expect(year.bucketStarts).toHaveLength(12);
    expect(iso(year.bucketStarts[6]!)).toBe('2026-06-30T22:00:00.000Z');
    expect(iso(year.baselineStart)).toBe('2025-11-30T23:00:00.000Z');
    expect(year.every).toBe('1mo');
  });
});

describe('bucketDeltas', () => {
  const H = 3_600_000;
  const base = Date.parse('2026-11-08T22:00:00Z');
  const starts = [1, 2, 3, 4, 5, 6].map((i) => base + i * H);
  const now = starts.at(-1)! + 10 * 60_000;

  it('computes deltas against the baseline bucket', () => {
    const last = new Map([
      [base, 100],
      ...starts.map((s, i) => [s, 100 + (i + 1) * 0.5] as [number, number]),
    ]);
    const deltas = bucketDeltas(last, starts, base, now);
    expect(deltas.map((x) => x.value)).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(deltas.some((x) => x.gapStart)).toBe(false);
  });

  it('marks the value after a gap with the start of the gap', () => {
    const last = new Map([
      [base, 10],
      [starts[0]!, 11],
      [starts[3]!, 14],
      [starts[4]!, 14.5],
    ]);
    const deltas = bucketDeltas(last, starts, base, now);
    expect(deltas.map((x) => x.value)).toEqual([1, null, null, 3, 0.5, null]);
    expect(deltas[3]!.gapStart).toBe(starts[1]);
  });

  it('uses an older value as baseline and marks the gap from the baseline bucket', () => {
    const last = new Map([
      [base - 5 * H, 7],
      [starts[0]!, 9],
    ]);
    const deltas = bucketDeltas(last, starts, base, now);
    expect(deltas[0]).toEqual({ start: starts[0], value: 2, gapStart: base });
  });

  it('leaves future buckets empty and skips counter resets', () => {
    const last = new Map([
      [base, 500],
      [starts[0]!, 3],
    ]);
    const deltas = bucketDeltas(last, starts, base, starts[1]! - 1);
    expect(deltas[0]!.value).toBeNull();
    expect(deltas.slice(1).every((x) => x.value === null && !x.gapStart)).toBe(true);
  });
});
