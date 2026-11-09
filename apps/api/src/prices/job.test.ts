import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { zonedToUtc } from '../time';
import type { PricePoint } from './entsoe';
import type { GasPricePoint } from './energyzero';
import { PriceJob, type PriceFetchers } from './job';
import type { PriceKind, PriceStore } from './store';

const HOUR = 3_600_000;

class MemoryStore implements PriceStore {
  electricity = new Map<number, PricePoint>();
  gas = new Map<number, GasPricePoint>();
  writeElectricity(points: PricePoint[]) {
    points.forEach((p) => this.electricity.set(p.time.getTime(), p));
    return Promise.resolve();
  }
  writeGas(points: GasPricePoint[]) {
    points.forEach((p) => this.gas.set(p.time.getTime(), p));
    return Promise.resolve();
  }
  pointsPerDay(kind: PriceKind, from: Date, to: Date) {
    const result = new Map<number, number>();
    const source = kind === 'electricity' ? this.electricity : this.gas;
    for (let d = from.getTime(); d < to.getTime();) {
      const date = new Date(d);
      const next = zonedToUtc({
        year: Number(
          date.toLocaleString('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric' }),
        ),
        month: Number(
          date.toLocaleString('en-CA', { timeZone: 'Europe/Amsterdam', month: 'numeric' }),
        ),
        day:
          Number(date.toLocaleString('en-CA', { timeZone: 'Europe/Amsterdam', day: 'numeric' })) +
          1,
      }).getTime();
      result.set(d, [...source.keys()].filter((t) => t >= d && t < next).length);
      d = next;
    }
    return Promise.resolve(result);
  }
}

/** Hourly prices for every hour in [from, to). */
function fakeFetchers(calls: Array<[string, string, string]>): PriceFetchers {
  const hours = (from: Date, to: Date) => {
    const out: Date[] = [];
    for (let t = from.getTime(); t < to.getTime(); t += HOUR) out.push(new Date(t));
    return out;
  };
  return {
    electricity: (from, to) => {
      calls.push(['electricity', from.toISOString(), to.toISOString()]);
      return Promise.resolve(
        hours(from, to).map((time) => ({ time, eurPerKwh: 0.1, resolution: 'PT60M' as const })),
      );
    },
    gas: (from, to) => {
      calls.push(['gas', from.toISOString(), to.toISOString()]);
      return Promise.resolve(hours(from, to).map((time) => ({ time, eurPerM3: 0.8 })));
    },
  };
}

const log = pino({ level: 'silent' });

describe('PriceJob.fill', () => {
  it('fetches only missing days, in one request for a consecutive range', async () => {
    const store = new MemoryStore();
    const calls: Array<[string, string, string]> = [];
    const job = new PriceJob(store, fakeFetchers(calls), log);
    const from = zonedToUtc({ year: 2026, month: 11, day: 1 });
    const to = zonedToUtc({ year: 2026, month: 11, day: 8 });

    expect(await job.fill('electricity', from, to)).toBe(7 * 24);
    expect(calls).toEqual([['electricity', from.toISOString(), to.toISOString()]]);

    calls.length = 0;
    expect(await job.fill('electricity', from, to)).toBe(0); // idempotent: nothing missing
    expect(calls).toEqual([]);
  });

  it('handles DST days (23 and 25 hours) as complete', async () => {
    const store = new MemoryStore();
    const calls: Array<[string, string, string]> = [];
    const job = new PriceJob(store, fakeFetchers(calls), log);
    const from = zonedToUtc({ year: 2026, month: 3, day: 28 });
    const to = zonedToUtc({ year: 2026, month: 3, day: 30 });
    await job.fill('gas', from, to);
    calls.length = 0;
    await job.fill('gas', from, to);
    expect(calls).toEqual([]);
  });

  it('splits long gaps into chunks of at most 31 days', async () => {
    const calls: Array<[string, string, string]> = [];
    const job = new PriceJob(new MemoryStore(), fakeFetchers(calls), log);
    await job.fill(
      'gas',
      zonedToUtc({ year: 2026, month: 1, day: 1 }),
      zonedToUtc({ year: 2026, month: 3, day: 1 }),
    );
    expect(calls).toHaveLength(2);
  });
});
