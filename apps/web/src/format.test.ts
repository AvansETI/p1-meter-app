import { describe, expect, it } from 'vitest';
import { formatPower, formatPowerText } from './format';

describe('formatPower', () => {
  it.each([
    [0.93, '930 W'],
    [-0.93, '930 W'],
    [0.055, '55 W'],
    [0, '0 W'],
    [0.9994, '999 W'],
    [0.9996, '1,00 kW'],
    [1, '1,00 kW'],
    [3.52, '3,52 kW'],
    [-1.2, '1,20 kW'],
  ])('%s kW → %s', (kw, text) => {
    expect(formatPowerText(kw)).toBe(text);
  });

  it('returns value and unit separately for the live tile', () => {
    expect(formatPower(0.31)).toEqual({ value: '310', unit: 'W' });
  });
});
