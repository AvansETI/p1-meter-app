import type { Totals } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { compare } from './comparison';

const totals = (overrides: Partial<Totals> = {}): Totals => ({
  importKwh: 100,
  exportKwh: 20,
  netKwh: 80,
  gasM3: 10,
  complete: true,
  ...overrides,
});

describe('compare', () => {
  it('rates less import as good and more import as bad', () => {
    expect(compare(totals({ importKwh: 88 }), totals(), 'import')).toEqual({
      percent: -12,
      tone: 'good',
    });
    expect(compare(totals({ importKwh: 110 }), totals(), 'import')).toEqual({
      percent: 10,
      tone: 'bad',
    });
  });

  it('rates more export as good', () => {
    expect(compare(totals({ exportKwh: 30 }), totals(), 'export')).toEqual({
      percent: 50,
      tone: 'good',
    });
  });

  it('is neutral below 2 %', () => {
    expect(compare(totals({ gasM3: 10.1 }), totals(), 'gas')).toEqual({
      percent: 1,
      tone: 'neutral',
    });
  });

  it('reports incomplete periods and missing comparisons', () => {
    expect(compare(totals({ complete: false }), totals(), 'import')).toBe('incomplete');
    expect(compare(totals(), null, 'import')).toBeNull();
    expect(compare(totals(), totals({ gasM3: 0 }), 'gas')).toBeNull();
    expect(compare(totals({ exportKwh: undefined }), totals(), 'export')).toBeNull();
  });
});
