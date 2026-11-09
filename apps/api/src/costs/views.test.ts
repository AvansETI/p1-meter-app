import { addDays, type Capabilities, type PlainDate, type TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { FakeDataSource } from '../data/fake';
import type { CounterField } from '../data/source';
import { CostCache } from '../db/costs';
import { openDatabase } from '../db/database';
import { TariffRepository } from '../db/tariffs';
import { zonedToUtc } from '../time';
import { CostService } from './service';
import { quarterStarts } from './usage';
import { CostViews } from './views';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const caps: Capabilities = {
  hasExport: false,
  hasGas: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-01-11T00:00:00Z',
};
const jan = (day: number): PlainDate => ({ year: 2026, month: 1, day });
/** 24 kWh × € 0.30 + € 1 fixed (31 / 31 days) = € 8.20 per full day. */
const period: TariffPeriod = {
  validFrom: '2026-01-01',
  electricity: { type: 'single', perKwh: 0.3 },
  export: { compensationPerKwh: 0, feePerKwh: 0 },
  fixed: { supplierPerMonth: 31, gridPerMonth: 0 },
  taxReductionPerYear: 0,
};
/** Sunday 11 January 2026, 12:00 local time. */
const NOW = zonedToUtc(jan(11), 12).getTime();

function setup(withTariffs = true) {
  const quarters = new Map<number, Partial<Record<CounterField, number>>>();
  let counter = 1000;
  for (let d = 0; d < 11; d++) {
    for (const start of quarterStarts(addDays(jan(1), d))) {
      counter += 0.25;
      quarters.set(start, { energy_consumed: counter });
    }
  }
  // Last value just before 1 January.
  const counters = new Map([[zonedToUtc(jan(1)).getTime() - 60_000, { energy_consumed: 1000 }]]);
  const source = new FakeDataSource({ [SIG]: { capabilities: caps, quarters, counters } });
  const db = openDatabase(':memory:');
  const tariffs = new TariffRepository(db);
  if (withTariffs) tariffs.save(SIG, { own: { periods: [period] } }, 0);
  return new CostViews(new CostService(source, undefined, tariffs, new CostCache(db)));
}

describe('CostViews.today', () => {
  it('reports "not configured" without tariffs', async () => {
    expect(await setup(false).today(SIG, caps, NOW)).toEqual({ configured: false });
  });

  it('counts fixed costs pro rata for the part of the day that has passed', async () => {
    const today = await setup().today(SIG, caps, NOW);
    expect(today.own).toMatchObject({ electricityEur: 3.6, fixedEur: 0.5, totalEur: 4.1 });
  });
});

describe('CostViews.history', () => {
  it('is absent without tariffs', async () => {
    expect(await setup(false).history(SIG, caps, 'week', jan(5), NOW)).toBeUndefined();
  });

  it('gives a value per day, totals and the elapsed part of the previous week', async () => {
    const costs = (await setup().history(SIG, caps, 'week', jan(5), NOW))!;
    expect(costs.buckets.map((b) => b.own)).toEqual([8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 4.1]);
    expect(costs.totals).toEqual({ own: 53.3, complete: true });
    // 29–31 December have no tariff; 1–3 January whole, 4 January until 12:00.
    expect(costs.previous).toEqual({ own: 28.7, complete: false });
    expect(costs.forecast).toBeUndefined();
  });

  it('spreads a day over its hours', async () => {
    const costs = (await setup().history(SIG, caps, 'day', jan(10), NOW))!;
    expect(costs.buckets).toHaveLength(24);
    expect(costs.buckets[0]!.own).toBeCloseTo(0.3 + 1 / 24);
    expect(costs.totals.own).toBeCloseTo(8.2);
  });

  it('forecasts the current month from the average of the last 30 days', async () => {
    const costs = (await setup().history(SIG, caps, 'month', jan(1), NOW))!;
    expect(costs.totals.own).toBeCloseTo(10 * 8.2 + 4.1);
    expect(costs.forecast).toEqual({ own: 254.2, basis: 'last-30-days' });
  });

  it('sums days per month in the year view', async () => {
    const costs = (await setup().history(SIG, caps, 'year', jan(1), NOW))!;
    expect(costs.buckets[0]!.own).toBeCloseTo(86.1);
    expect(costs.buckets[1]!.own).toBeNull();
    expect(costs.forecast?.basis).toBe('last-30-days');
  });
});
