import { describe, expect, it } from 'vitest';
import { HOUR_MS, detectHourlyUpdates, hourlyGas } from './gas';

const now = Date.parse('2026-11-09T14:25:00Z');
const current = Date.parse('2026-11-09T14:00:00Z');
const h = (offset: number) => current + offset * HOUR_MS;

describe('hourlyGas', () => {
  it('returns 24 hours ending with the current hour', () => {
    const hours = hourlyGas(new Map(), now);
    expect(hours).toHaveLength(24);
    expect(hours[0]!.start).toBe('2026-11-08T15:00:00.000Z');
    expect(hours[23]!.start).toBe('2026-11-09T14:00:00.000Z');
    expect(hours.every((x) => x.m3 === null)).toBe(true);
  });

  it('computes the use per hour from the counter at the end of each hour', () => {
    const counter = new Map([
      [h(-3), 100],
      [h(-2), 100.4],
      [h(-1), 100.9],
      [h(0), 101.05],
    ]);
    const hours = hourlyGas(counter, now).slice(-3);
    expect(hours.map((x) => x.m3)).toEqual([0.4, 0.5, 0.15]);
    expect(hours.some((x) => x.spansGap)).toBe(false);
  });

  it('puts the use during a gap in one marked value after it', () => {
    const counter = new Map([
      [h(-6), 50],
      [h(-5), 50.2],
      [h(-1), 51.4],
      [h(0), 51.5],
    ]);
    const hours = hourlyGas(counter, now).slice(-6);
    expect(hours.map((x) => x.m3)).toEqual([0.2, null, null, null, 1.2, 0.1]);
    expect(hours[4]).toMatchObject({ spansGap: true, gapStart: new Date(h(-4)).toISOString() });
  });

  it('skips negative deltas (counter replaced)', () => {
    const counter = new Map([
      [h(-1), 900],
      [h(0), 3],
    ]);
    expect(hourlyGas(counter, now).at(-1)!.m3).toBeNull();
  });
});

describe('detectHourlyUpdates', () => {
  const at = (minute: number, hour: number) => Date.UTC(2026, 10, 9, hour, minute);

  it('recognises hourly gas reports', () => {
    expect(detectHourlyUpdates([at(2, 8), at(1, 9), at(3, 10), at(1, 11)])).toBe(true);
  });

  it('treats 5-minute reports as not hourly', () => {
    expect(detectHourlyUpdates([at(5, 8), at(20, 8), at(35, 8), at(50, 8), at(2, 9)])).toBe(false);
  });

  it('needs at least three increases', () => {
    expect(detectHourlyUpdates([at(1, 8), at(1, 9)])).toBe(false);
  });
});
