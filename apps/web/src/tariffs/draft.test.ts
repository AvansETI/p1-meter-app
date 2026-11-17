import type { TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { emptyDraft, fromDraft, parseAmount, summary, toDraft } from './draft';

const period: TariffPeriod = {
  validFrom: '2026-01-01',
  name: 'Vattenfall vast',
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

  it('leaves out an empty name and rejects one that is too long', () => {
    const result = fromDraft({ ...toDraft(period), name: '  ' });
    expect(result.ok && result.period).not.toHaveProperty('name');
    expect(fromDraft({ ...toDraft(period), name: 'x'.repeat(41) })).toEqual({
      ok: false,
      fields: ['name'],
    });
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
        ['grid', 'perM3', 'supplierPerMonth', 'taxReductionPerYear'].sort(),
      );
    }
  });

  it('builds a dynamic contract with VAT for gas mapped to its own field', () => {
    const draft = {
      ...emptyDraft('2026-01-01', true),
      electricityType: 'dynamic' as const,
      markupPerKwh: '0,02',
      energyTaxPerKwh: '0,1',
      gasType: 'dynamic' as const,
      markupPerM3: '0,05',
      energyTaxPerM3: '0,6',
      gasVatPercent: '200',
      supplierPerMonth: '6',
      grid: '40',
      taxReductionPerYear: '630',
    };
    const result = fromDraft(draft);
    expect(result).toEqual({ ok: false, fields: ['gasVatPercent'] });
  });

  it('keeps fixed costs as entered: excl. VAT and grid costs per day (#88)', () => {
    const invoice: TariffPeriod = {
      ...period,
      fixed: { supplierPerMonth: 4.95, gridPerDay: 1.08, exclVat: true },
      taxReductionPerYear: 519.8,
    };
    const draft = toDraft(invoice);
    expect(draft).toMatchObject({ grid: '1,08', gridUnit: 'day', fixedExclVat: true });
    expect(fromDraft(draft)).toEqual({ ok: true, period: invoice });
    expect(fromDraft({ ...draft, gridUnit: 'month', fixedExclVat: false })).toMatchObject({
      period: { fixed: { supplierPerMonth: 4.95, gridPerMonth: 1.08 } },
    });
  });

  describe('dynamic export (#88)', () => {
    const dynamic: TariffPeriod = {
      ...period,
      electricity: {
        type: 'dynamic',
        markupPerKwh: 0.0205,
        energyTaxPerKwh: 0.0916,
        vatPercent: 21,
      },
      export: { compensationPerKwh: 0, feePerKwh: 0.0205, refundMarkupOnExport: true },
    };

    it('round-trips the selling fee and the refunded markup', () => {
      expect(fromDraft(toDraft(dynamic))).toEqual({ ok: true, period: dynamic });
    });

    it('ignores a hidden, invalid feed-in compensation', () => {
      const draft = { ...toDraft(dynamic), compensationPerKwh: '' };
      expect(fromDraft(draft)).toEqual({ ok: true, period: dynamic });
    });

    it('drops the refund switch for single and double tariffs', () => {
      const draft = { ...toDraft(period), refundMarkupOnExport: true };
      expect(fromDraft(draft)).toEqual({ ok: true, period });
    });

    it.each([
      [0, { feePerKwh: '0', refundMarkupOnExport: false, dynamicMarkupPerKwh: '' }],
      [0.0205, { feePerKwh: '0', refundMarkupOnExport: true, dynamicMarkupPerKwh: '' }],
      [-0.03, { feePerKwh: '0,03', refundMarkupOnExport: false, dynamicMarkupPerKwh: '' }],
      [0.01, { feePerKwh: '0', refundMarkupOnExport: false, dynamicMarkupPerKwh: '0,01' }],
    ])('converts a legacy export markup of %s', (legacy, expected) => {
      const old: TariffPeriod = {
        ...dynamic,
        export: { compensationPerKwh: 0, feePerKwh: 0, dynamicMarkupPerKwh: legacy },
      };
      expect(toDraft(old)).toMatchObject(expected);
    });

    it('keeps an unconverted legacy markup until it is removed', () => {
      const old: TariffPeriod = {
        ...dynamic,
        export: { compensationPerKwh: 0, feePerKwh: 0, dynamicMarkupPerKwh: 0.01 },
      };
      const draft = toDraft(old);
      expect(fromDraft(draft)).toEqual({ ok: true, period: old });
      expect(fromDraft({ ...draft, dynamicMarkupPerKwh: '' })).toMatchObject({
        period: { export: { compensationPerKwh: 0, feePerKwh: 0 } },
      });
    });
  });

  it('summarises a period', () => {
    expect(summary(period)).toBe('Dubbel tarief · € 0,32 / € 0,28');
  });
});
