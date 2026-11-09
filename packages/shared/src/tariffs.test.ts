import { describe, expect, it } from 'vitest';
import { TariffProfilesSchema, periodOn, type TariffPeriod } from './tariffs';

const period = (validFrom: string, perKwh = 0.3): TariffPeriod => ({
  validFrom,
  electricity: { type: 'single', perKwh },
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  gas: { type: 'fixed', perM3: 1.4 },
  fixed: { supplierPerMonth: 7, gridPerMonth: 40 },
  taxReductionPerYear: 630,
});

describe('TariffProfilesSchema', () => {
  it('accepts all contract types and sorts periods by date', () => {
    const parsed = TariffProfilesSchema.parse({
      own: { periods: [period('2026-01-01'), period('2025-01-01')] },
      compare: {
        name: ' Dynamisch ',
        periods: [
          {
            ...period('2023-08-01'),
            electricity: {
              type: 'dynamic',
              markupPerKwh: 0.02,
              energyTaxPerKwh: 0.1,
              vatPercent: 21,
            },
            export: { compensationPerKwh: 0, feePerKwh: 0.01, dynamicMarkupPerKwh: -0.02 },
            gas: { type: 'dynamic', markupPerM3: 0.05, energyTaxPerM3: 0.6, vatPercent: 21 },
          },
        ],
      },
    });
    expect(parsed.own.periods.map((p) => p.validFrom)).toEqual(['2025-01-01', '2026-01-01']);
    expect(parsed.compare?.name).toBe('Dynamisch');
  });

  it.each([
    ['duplicate dates', { own: { periods: [period('2026-01-01'), period('2026-01-01')] } }],
    ['negative price', { own: { periods: [period('2026-01-01', -1)] } }],
    ['bad date', { own: { periods: [period('2026-1-1')] } }],
    ['empty compare name', { own: { periods: [] }, compare: { name: ' ', periods: [] } }],
  ])('rejects %s', (_name, value) => {
    expect(TariffProfilesSchema.safeParse(value).success).toBe(false);
  });
});

describe('periodOn', () => {
  const list = [period('2025-01-01', 0.25), period('2026-01-01', 0.3)];
  it('returns the period valid on a date', () => {
    expect(periodOn(list, '2024-12-31')).toBeUndefined();
    expect(periodOn(list, '2025-06-01')?.electricity).toEqual({ type: 'single', perKwh: 0.25 });
    expect(periodOn(list, '2026-01-01')?.electricity).toEqual({ type: 'single', perKwh: 0.3 });
  });
});
