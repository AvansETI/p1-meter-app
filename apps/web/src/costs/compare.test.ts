import { describe, expect, it } from 'vitest';
import { formatEuro } from '../format';
import { contractDifference, costChange } from './compare';

describe('formatEuro', () => {
  it.each([
    [1234.567, '€ 1.234,57'],
    [-3.1, '−€ 3,10'],
    [-0.001, '€ 0,00'],
  ])('%d → %s', (value, expected) => {
    expect(formatEuro(value)).toBe(expected);
  });
});

describe('contractDifference', () => {
  it('says whether the other contract is cheaper or more expensive', () => {
    expect(contractDifference(3.12, 2.71)).toEqual({ amount: 0.41, tone: 'cheaper' });
    expect(contractDifference(3, 3.5)).toEqual({ amount: 0.5, tone: 'dearer' });
    expect(contractDifference(3, 3)).toEqual({ amount: 0, tone: 'same' });
    expect(contractDifference(null, 3)).toBeNull();
  });
});

describe('costChange', () => {
  const totals = (own: number | null, complete = true) => ({ own, complete });
  it('treats lower costs as good', () => {
    expect(costChange(totals(90), totals(100))).toEqual({ percent: -10, tone: 'good' });
    expect(costChange(totals(110), totals(100))).toEqual({ percent: 10, tone: 'bad' });
    expect(costChange(totals(101), totals(100))).toEqual({ percent: 1, tone: 'neutral' });
  });

  it('is incomplete or absent when data is missing', () => {
    expect(costChange(totals(90, false), totals(100))).toBe('incomplete');
    expect(costChange(totals(90), null)).toBeNull();
    expect(costChange(totals(null), totals(100))).toBeNull();
  });
});
