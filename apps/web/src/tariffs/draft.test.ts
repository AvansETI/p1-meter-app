import type { TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { emptyDraft, fromDraft, parseAmount, summary, toDraft } from './draft';

const period: TariffPeriod = {
  validFrom: '2026-01-01',
  electricity: { type: 'double', normalPerKwh: 0.32, offPeakPerKwh: 0.28 },
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  gas: { type: 'fixed', perM3: 1.42 },
  fixed: { supplierPerMonth: 7.5, gridPerMonth: 41 },
  taxReductionPerYear: 631.39,
};

describe('parseAmount', () => {
  it.each([
    ['0,30', 0.3],
    ['0.30', 0.3],
    [' 1 234,5 ', 1234.5],
    ['-0,02', -0.02],
    ['', Number.NaN],
    ['abc', Number.NaN],
  ])('%j → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe('draft conversion', () => {
  it('round-trips a period through the form', () => {
    const result = fromDraft(toDraft(period));
    expect(result).toEqual({ ok: true, period });
  });

  it('shows amounts with a decimal comma', () => {
    expect(toDraft(period).normalPerKwh).toBe('0,32');
  });

  it('reports the fields that are missing or wrong', () => {
    const draft = { ...emptyDraft('2026-01-01', true), perKwh: '0,30' };
    const result = fromDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.sort()).toEqual(
        ['gridPerMonth', 'perM3', 'supplierPerMonth', 'taxReductionPerYear'].sort(),
      );
    }
  });

  it('builds a dynamic contract with VAT for gas mapped to its own field', () => {
    const draft = {
      ...emptyDraft('2026-01-01', true),
      electricityType: 'dynamic' as const,
      markupPerKwh: '0,02',
      energyTaxPerKwh: '0,1',
      dynamicMarkupPerKwh: '-0,02',
      gasType: 'dynamic' as const,
      markupPerM3: '0,05',
      energyTaxPerM3: '0,6',
      gasVatPercent: '200',
      supplierPerMonth: '6',
      gridPerMonth: '40',
      taxReductionPerYear: '630',
    };
    const result = fromDraft(draft);
    expect(result).toEqual({ ok: false, fields: ['gasVatPercent'] });
  });

  it('summarises a period', () => {
    expect(summary(period)).toBe('Dubbel tarief · € 0,32 / € 0,28');
  });
});
