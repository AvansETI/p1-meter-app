import { describe, expect, it } from 'vitest';
import { zonedToUtc } from '../time';
import { dayUsages, quarterDeltas, quarterStarts } from './usage';

const Q = 15 * 60_000;
const day = { year: 2026, month: 6, day: 1 };
const start = zonedToUtc(day).getTime();
const series = (values: Array<number | undefined>, baseline?: number) => ({
  last: new Map(
    values.flatMap((v, i) => (v === undefined ? [] : [[start + i * Q, v] as [number, number]])),
  ),
  ...(baseline !== undefined && { baseline }),
});

describe('quarterStarts', () => {
  it.each([
    [{ year: 2026, month: 6, day: 1 }, 96],
    [{ year: 2026, month: 3, day: 29 }, 92], // summer time starts
    [{ year: 2026, month: 10, day: 25 }, 100], // winter time starts
  ])('%j has %d quarters', (date, count) => {
    expect(quarterStarts(date)).toHaveLength(count);
  });
});

describe('quarterDeltas', () => {
  const starts = [0, 1, 2, 3, 4, 5].map((i) => start + i * Q);
  const now = start + 100 * Q;

  it('takes the difference with the previous quarter, starting from the baseline', () => {
    expect(quarterDeltas(series([10.5, 11, 11, 12], 10), starts.slice(0, 4), now).values).toEqual([
      0.5, 0.5, 0, 1,
    ]);
  });

  it('spreads use over a gap; only gaps longer than an hour are estimates', () => {
    const short = quarterDeltas(series([10, undefined, undefined, 13], 9), starts.slice(0, 4), now);
    expect(short.values).toEqual([1, 1, 1, 1]);
    expect(short.estimated).toEqual([false, false, false, false]);

    const long = quarterDeltas(
      series([undefined, undefined, undefined, undefined, 15], 10),
      starts.slice(0, 5),
      now,
    );
    expect(long.values).toEqual([1, 1, 1, 1, 1]);
    expect(long.estimated.every(Boolean)).toBe(true);
  });

  it('leaves quarters unknown without a baseline, after the last value and after now', () => {
    const result = quarterDeltas(series([10, 11, undefined, undefined]), starts.slice(0, 4), now);
    expect(result.values).toEqual([null, 1, null, null]);
    expect(quarterDeltas(series([10, 11], 9), starts.slice(0, 2), start + Q).values).toEqual([
      1,
      null,
    ]);
  });

  it('counts a counter that went down (meter replaced) as 0, estimated', () => {
    const result = quarterDeltas(series([5], 10), starts.slice(0, 1), now);
    expect(result).toEqual({ values: [0], estimated: [true] });
  });
});

describe('dayUsages', () => {
  it('combines import, export, gas and prices per day', () => {
    const n = 96;
    const counter = (step: number) => ({
      last: new Map(Array.from({ length: n }, (_, i) => [start + i * Q, (i + 1) * step])),
      baseline: 0,
    });
    const [usage] = dayUsages({
      days: [day],
      importSeries: counter(0.25),
      exportSeries: counter(0.1),
      gasSeries: counter(0.01),
      prices: new Map([[start, 0.12]]),
      gasPrices: new Map([
        [start, 0.8],
        [start + 4 * Q, 0.9],
      ]),
      now: start + 2 * 86_400_000,
    });
    expect(usage!.quarters).toHaveLength(n);
    expect(usage!.quarters[0]).toEqual({ start, importKwh: 0.25, exportKwh: 0.1, price: 0.12 });
    expect(usage!.quarters[1]).not.toHaveProperty('price');
    expect(usage!.gasM3).toBeCloseTo(0.96);
    expect(usage!.gasPrice).toBeCloseTo(0.85);
    expect(usage!.estimated).toBe(false);
  });

  it('omits gas for households without gas and uses 0 export without export', () => {
    const [usage] = dayUsages({
      days: [day],
      importSeries: series([1], 0),
      prices: new Map(),
      gasPrices: new Map(),
      now: start + Q,
    });
    expect(usage).not.toHaveProperty('gasM3');
    expect(usage!.quarters[0]).toEqual({ start, importKwh: 1, exportKwh: 0 });
    expect(usage!.quarters[1]).toBeNull();
  });
});
