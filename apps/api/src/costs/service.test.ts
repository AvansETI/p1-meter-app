import { addDays, type Capabilities, type PlainDate, type TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { FakeDataSource } from '../data/fake';
import type { CounterField } from '../data/source';
import { CostCache } from '../db/costs';
import { openDatabase } from '../db/database';
import { TariffRepository } from '../db/tariffs';
import type { PriceReader } from '../prices/store';
import { zonedToUtc } from '../time';
import { CostService } from './service';
import { quarterStarts } from './usage';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const caps: Capabilities = {
  hasExport: false,
  hasGas: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-01-10T00:00:00Z',
};
const jan = (day: number): PlainDate => ({ year: 2026, month: 1, day });
const period = (validFrom: string, perKwh: number): TariffPeriod => ({
  validFrom,
  electricity: { type: 'single', perKwh },
  export: { compensationPerKwh: 0, feePerKwh: 0 },
  fixed: { supplierPerMonth: 0, gridPerMonth: 0 },
  taxReductionPerYear: 0,
});
const dynamic: TariffPeriod = {
  ...period('2026-01-01', 0),
  electricity: { type: 'dynamic', markupPerKwh: 0, energyTaxPerKwh: 0, vatPercent: 0 },
};

/** 0.25 kWh per quarter hour (24 kWh a day) from 1 January 2026, for `days` days. */
function household(days: number) {
  const quarters = new Map<number, Partial<Record<CounterField, number>>>();
  let counter = 1000;
  for (let d = 0; d < days; d++) {
    for (const start of quarterStarts(addDays(jan(1), d))) {
      counter += 0.25;
      quarters.set(start, { energy_consumed: counter });
    }
  }
  // Last value just before 1 January.
  const counters = new Map([[zonedToUtc(jan(1)).getTime() - 60_000, { energy_consumed: 1000 }]]);
  return new FakeDataSource({ [SIG]: { capabilities: caps, quarters, counters } });
}

class FakePrices implements PriceReader {
  prices = new Map<number, number>();
  electricityPrices(from: Date, to: Date) {
    return Promise.resolve(
      new Map([...this.prices].filter(([t]) => t >= from.getTime() && t < to.getTime())),
    );
  }
  gasPrices() {
    return Promise.resolve(new Map<number, number>());
  }
}

function setup(days = 10) {
  const db = openDatabase(':memory:');
  const tariffs = new TariffRepository(db);
  const source = household(days);
  const prices = new FakePrices();
  const service = new CostService(source, prices, tariffs, new CostCache(db));
  const now = zonedToUtc(addDays(jan(1), days)).getTime() + 12 * 3_600_000;
  return { tariffs, source, prices, service, now };
}

const totals = (entries: Array<{ cost: unknown }>) =>
  entries.map((e) =>
    typeof e.cost === 'string' ? e.cost : (e.cost as { totalEur: number }).totalEur,
  );

describe('CostService', () => {
  it('returns "no-tariff" without tariffs and does not read any data', async () => {
    const { service, source, now } = setup();
    const result = await service.days(SIG, caps, jan(3), jan(4), now);
    expect(totals(result.own)).toEqual(['no-tariff', 'no-tariff']);
    expect(source.calls).toBe(0);
  });

  it('computes days from 1 January and serves them from the cache afterwards', async () => {
    const { tariffs, service, source, now } = setup();
    tariffs.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);

    const first = await service.days(SIG, caps, jan(5), jan(6), now);
    expect(totals(first.own).map((v) => Number(v).toFixed(2))).toEqual(['7.20', '7.20']);

    const calls = source.calls;
    const again = await service.days(SIG, caps, jan(2), jan(6), now);
    expect(again.own).toHaveLength(5);
    expect(source.calls).toBe(calls); // all cached
  });

  it('recomputes after a tariff change', async () => {
    const { tariffs, service, now } = setup();
    tariffs.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    await service.days(SIG, caps, jan(5), jan(5), now);
    tariffs.save(SIG, { own: { periods: [period('2026-01-01', 0.4)] } }, 1);
    const result = await service.days(SIG, caps, jan(5), jan(5), now);
    expect(Number(totals(result.own)[0])).toBeCloseTo(24 * 0.4);
  });

  it('returns both profiles and keeps days without prices out of the cache', async () => {
    const { tariffs, service, prices, now } = setup();
    tariffs.save(
      SIG,
      {
        own: { periods: [period('2026-01-01', 0.3)] },
        compare: { name: 'Dynamisch', periods: [dynamic] },
      },
      0,
    );
    const before = await service.days(SIG, caps, jan(5), jan(5), now);
    expect(before.compare?.name).toBe('Dynamisch');
    expect(totals(before.compare!.days)).toEqual(['no-price']);

    for (let d = 0; d < 10; d++) {
      for (const start of quarterStarts(addDays(jan(1), d))) prices.prices.set(start, 0.1);
    }
    const after = await service.days(SIG, caps, jan(5), jan(5), now);
    expect(Number(totals(after.compare!.days)[0])).toBeCloseTo(24 * 0.1);
  });

  it('does not cache the current day', async () => {
    const { tariffs, service, source, now } = setup();
    tariffs.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    const today = addDays(jan(1), 10);
    await service.days(SIG, caps, today, today, now);
    const calls = source.calls;
    await service.days(SIG, caps, today, today, now);
    expect(source.calls).toBeGreaterThan(calls);
  });
});
