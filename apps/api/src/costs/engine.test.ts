import type { PlainDate, TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { zonedToUtc } from '../time';
import {
  dayCost,
  emptyBalance,
  isOffPeak,
  type Balance,
  type DayCost,
  type DayUsage,
  type QuarterUsage,
} from './engine';

const date = (s: string): PlainDate => {
  const [year, month, day] = s.split('-').map(Number) as [number, number, number];
  return { year, month, day };
};

/** A quarter hour at local `hour`:`minute` on `day`. */
const q = (
  day: string,
  hour: number,
  minute: number,
  importKwh: number,
  exportKwh = 0,
  price?: number,
): QuarterUsage => ({
  start: zonedToUtc(date(day), hour).getTime() + minute * 60_000,
  importKwh,
  exportKwh,
  ...(price !== undefined && { price }),
});

const usage = (
  day: string,
  quarters: Array<QuarterUsage | null>,
  extra: Partial<DayUsage> = {},
): DayUsage => ({
  date: date(day),
  quarters,
  estimated: false,
  ...extra,
});

const base: Omit<TariffPeriod, 'electricity'> = {
  validFrom: '2020-01-01',
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  fixed: { supplierPerMonth: 0, gridPerMonth: 0 },
  taxReductionPerYear: 0,
};
const single: TariffPeriod = { ...base, electricity: { type: 'single', perKwh: 0.3 } };
const double: TariffPeriod = {
  ...base,
  electricity: { type: 'double', normalPerKwh: 0.32, offPeakPerKwh: 0.28 },
};
const dynamic: TariffPeriod = {
  ...base,
  electricity: { type: 'dynamic', markupPerKwh: 0.02, energyTaxPerKwh: 0.1, vatPercent: 21 },
  export: { compensationPerKwh: 0, feePerKwh: 0, dynamicMarkupPerKwh: -0.01 },
};

const cost = (result: ReturnType<typeof dayCost>): DayCost => {
  if (typeof result.cost === 'string') throw new Error(`unknown: ${result.cost}`);
  return result.cost;
};

/** Runs days in order with a running balance; returns each day's electricity cost. */
function run(periods: TariffPeriod[], days: DayUsage[], start?: Balance) {
  let balance = start ?? emptyBalance(days[0]!.date.year);
  return days.map((day) => {
    const result = dayCost(day, periods, balance);
    balance = result.balance;
    return { cost: cost(result).electricityEur, balance };
  });
}

describe('bands (double tariff)', () => {
  it.each([
    ['2026-11-09', 7, 0, false], // Monday 07:00: normal
    ['2026-11-09', 6, 45, true], // Monday 06:45: off-peak
    ['2026-11-09', 22, 45, false],
    ['2026-11-09', 23, 0, true],
    ['2026-11-14', 12, 0, true], // Saturday
    ['2026-11-15', 23, 30, true], // Sunday
    ['2026-03-29', 3, 0, true], // DST day (Sunday)
  ])('%s %d:%d off-peak = %s', (day, hour, minute, expected) => {
    expect(isOffPeak(q(day, hour, minute, 0).start)).toBe(expected);
  });
});

describe('single tariff', () => {
  it('without net metering (2027): import × price − export × compensation + fee', () => {
    const period = { ...single, export: { compensationPerKwh: 0.05, feePerKwh: 0.02 } };
    const [day] = run([period], [usage('2027-03-01', [q('2027-03-01', 12, 0, 1, 0.5)])]);
    expect(day!.cost).toBeCloseTo(1 * 0.3 - 0.5 * 0.05 + 0.5 * 0.02);
  });

  it('with net metering, export cancels import until the year balance turns negative', () => {
    const days = run(
      [single],
      [
        usage('2026-05-01', [q('2026-05-01', 12, 0, 0, 2)]), // surplus: earns compensation
        usage('2026-05-02', [q('2026-05-02', 20, 0, 3, 0)]), // first cancels the surplus
      ],
    );
    expect(days[0]!.cost).toBeCloseTo(-2 * 0.05);
    expect(days[1]!.cost).toBeCloseTo(2 * 0.05 + 1 * 0.3);
    // Year total: price × max(0, I − E).
    expect(days[0]!.cost + days[1]!.cost).toBeCloseTo(0.3);
  });

  it('nets export against earlier import at the full price', () => {
    const days = run(
      [single],
      [
        usage('2026-05-01', [q('2026-05-01', 8, 0, 5)]),
        usage('2026-05-02', [q('2026-05-02', 13, 0, 0, 4)]),
      ],
    );
    expect(days[0]!.cost).toBeCloseTo(1.5);
    expect(days[1]!.cost).toBeCloseTo(-1.2);
  });

  it('starts a new balance every year and stops netting from 2027', () => {
    const days = run(
      [single],
      [
        usage('2025-12-31', [q('2025-12-31', 8, 0, 10)]),
        usage('2026-01-01', [q('2026-01-01', 13, 0, 0, 4)]), // 2025 import does not count
        usage('2026-12-31', [q('2026-12-31', 13, 0, 0, 1)]),
        usage('2027-01-01', [q('2027-01-01', 8, 0, 2, 1)]),
      ],
    );
    expect(days[1]!.cost).toBeCloseTo(-4 * 0.05);
    expect(days[2]!.cost).toBeCloseTo(-1 * 0.05);
    expect(days[3]!.cost).toBeCloseTo(2 * 0.3 - 1 * 0.05);
    expect(days[3]!.balance.year).toBe(2027);
  });

  it('charges the feed-in fee on every exported kWh, also under net metering', () => {
    const period = { ...single, export: { compensationPerKwh: 0.05, feePerKwh: 0.1 } };
    const [day] = run([period], [usage('2026-05-01', [q('2026-05-01', 12, 0, 3, 1)])]);
    expect(day!.cost).toBeCloseTo(2 * 0.3 + 1 * 0.1);
  });
});

describe('double tariff', () => {
  it('nets per band and settles a surplus against the other band on 31 December', () => {
    const days = run(
      [double],
      [
        // Saturday: 6 kWh off-peak import.
        usage('2026-12-26', [q('2026-12-26', 12, 0, 6)]),
        // Thursday 31 Dec, 12:00 (normal): 4 kWh export → surplus in the normal band.
        usage('2026-12-31', [q('2026-12-31', 12, 0, 0, 4)]),
      ],
    );
    expect(days[0]!.cost).toBeCloseTo(6 * 0.28);
    // During the year: 4 kWh normal surplus earns compensation; at year end it cancels
    // 4 kWh of off-peak import instead.
    expect(days[1]!.cost).toBeCloseTo(-4 * 0.05 + 4 * (0.05 - 0.28));
    expect(days[0]!.cost + days[1]!.cost).toBeCloseTo(2 * 0.28);
  });

  it('uses the band price without net metering', () => {
    const [day] = run(
      [double],
      [usage('2027-03-01', [q('2027-03-01', 12, 0, 1), q('2027-03-01', 23, 0, 1)])],
    );
    expect(day!.cost).toBeCloseTo(0.32 + 0.28);
  });
});

describe('dynamic tariff', () => {
  it('without net metering: (price + markup + tax) × VAT for import, price + markup for export', () => {
    const [day] = run(
      [dynamic],
      [
        usage('2027-06-01', [
          q('2027-06-01', 12, 0, 1, 0, 0.1),
          q('2027-06-01', 13, 0, 0, 2, 0.05),
        ]),
      ],
    );
    expect(day!.cost).toBeCloseTo((0.1 + 0.02 + 0.1) * 1.21 - 2 * (0.05 - 0.01));
  });

  it('with net metering: supply per quarter, energy tax only on the net year import', () => {
    const days = run(
      [dynamic],
      [
        usage('2026-06-01', [q('2026-06-01', 13, 0, 0, 2, 0.05)]),
        usage('2026-06-02', [q('2026-06-02', 20, 0, 3, 0, 0.2)]),
      ],
    );
    expect(days[0]!.cost).toBeCloseTo(-2 * (0.05 - 0.01) * 1.21);
    expect(days[1]!.cost).toBeCloseTo((3 * (0.2 + 0.02) + 1 * 0.1) * 1.21);
  });

  it('is unknown when a price is missing for a quarter with usage', () => {
    const result = dayCost(
      usage('2027-06-01', [q('2027-06-01', 12, 0, 1), q('2027-06-01', 13, 0, 0, 0)]),
      [dynamic],
      emptyBalance(2027),
    );
    expect(result.cost).toBe('no-price');
    expect(result.balance.total).toBe(1);
  });

  it('ignores missing prices for quarters without usage', () => {
    const result = dayCost(
      usage('2027-06-01', [q('2027-06-01', 12, 0, 0, 0)]),
      [dynamic],
      emptyBalance(2027),
    );
    expect(cost(result).electricityEur).toBe(0);
  });
});

describe('gas, fixed costs and tax reduction', () => {
  const full: TariffPeriod = {
    ...single,
    gas: { type: 'fixed', perM3: 1.5 },
    fixed: { supplierPerMonth: 6, gridPerMonth: 22 },
    taxReductionPerYear: 365,
  };

  it('adds gas, fixed costs per day of the month and subtracts the tax reduction', () => {
    const result = dayCost(
      usage('2026-02-10', [q('2026-02-10', 12, 0, 1)], { gasM3: 2 }),
      [full],
      emptyBalance(2026),
    );
    expect(cost(result)).toMatchObject({
      electricityEur: 0.3,
      gasEur: 3,
      fixedEur: 1, // (6 + 22) / 28 days
      taxReductionEur: 1,
    });
    expect(cost(result).totalEur).toBeCloseTo(0.3 + 3 + 1 - 1);
  });

  it('spreads the tax reduction over 366 days in a leap year', () => {
    const result = dayCost(
      usage('2028-02-10', [q('2028-02-10', 12, 0, 0)]),
      [full],
      emptyBalance(2028),
    );
    expect(cost(result).taxReductionEur).toBeCloseTo(365 / 366);
  });

  it('prices dynamic gas per day and needs the day price', () => {
    const period: TariffPeriod = {
      ...full,
      gas: { type: 'dynamic', markupPerM3: 0.05, energyTaxPerM3: 0.6, vatPercent: 21 },
    };
    const day = (gasPrice?: number) =>
      dayCost(
        usage('2026-02-10', [q('2026-02-10', 12, 0, 0)], {
          gasM3: 2,
          ...(gasPrice !== undefined && { gasPrice }),
        }),
        [period],
        emptyBalance(2026),
      );
    expect(cost(day(0.84)).gasEur).toBeCloseTo(2 * (0.84 + 0.05 + 0.6) * 1.21);
    expect(day().cost).toBe('no-price');
  });
});

describe('unknown days', () => {
  it('has no cost before the first tariff period, but still counts usage for netting', () => {
    const later = { ...single, validFrom: '2026-06-01' };
    let balance = emptyBalance(2026);
    const before = dayCost(usage('2026-05-01', [q('2026-05-01', 12, 0, 0, 3)]), [later], balance);
    expect(before.cost).toBe('no-tariff');
    balance = before.balance;
    const after = dayCost(usage('2026-06-01', [q('2026-06-01', 20, 0, 5)]), [later], balance);
    expect(cost(after).electricityEur).toBeCloseTo(-3 * -0.05 + 2 * 0.3);
  });

  it('is unknown without usage data', () => {
    expect(dayCost(usage('2026-06-01', [null, null]), [single], emptyBalance(2026)).cost).toBe(
      'no-usage',
    );
    expect(
      dayCost(
        usage('2026-06-01', [q('2026-06-01', 1, 0, 1)], { gasM3: null }),
        [single],
        emptyBalance(2026),
      ).cost,
    ).toBe('no-usage');
  });

  it('marks days with missing quarters as estimated', () => {
    const result = dayCost(
      usage('2026-06-01', [q('2026-06-01', 1, 0, 1), null]),
      [single],
      emptyBalance(2026),
    );
    expect(cost(result).estimated).toBe(true);
  });
});
