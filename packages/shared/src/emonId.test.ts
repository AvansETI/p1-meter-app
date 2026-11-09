import { describe, expect, it } from 'vitest';
import { formatDynamicPart, formatEmonIdInput, maskSignature, normalizeEmonId } from './emonId';

const CANONICAL = '2019-ETI-EMON-V01-A1B2C3-000000';

describe('normalizeEmonId', () => {
  it.each([
    'A1B2C3-000000',
    'a1b2c3000000',
    ' a1b2 c300 0000 ',
    'A1B2C3--000000',
    '2019-ETI-EMON-V01-A1B2C3-000000',
    '2019-eti-emon-v01-a1b2c3000000',
  ])('accepts %j', (input) => {
    expect(normalizeEmonId(input)).toEqual({ ok: true, signature: CANONICAL });
  });

  it.each(['', 'A1B2C3', 'A1B2C3-00000', 'A1B2C3-0000000', 'G1B2C3-000000', 'A1B2C3_000000'])(
    'rejects %j',
    (input) => {
      expect(normalizeEmonId(input)).toEqual({ ok: false });
    },
  );
});

describe('formatEmonIdInput', () => {
  it.each([
    ['a1b2', 'A1B2'],
    ['a1b2c3', 'A1B2C3'],
    ['a1b2c30', 'A1B2C3-0'],
    ['a1 b2-c3 000000', 'A1B2C3-000000'],
    ['a1b2c3000000ff', 'A1B2C3-000000'],
    ['xyz123', '123'],
    ['2019-ETI-EMON-V01-A1B2C3-000000', 'A1B2C3-000000'],
  ])('%j → %j', (input, expected) => {
    expect(formatEmonIdInput(input)).toBe(expected);
  });
});

describe('formatDynamicPart', () => {
  it('strips the prefix', () => {
    expect(formatDynamicPart(CANONICAL)).toBe('A1B2C3-000000');
  });
});

describe('maskSignature', () => {
  it('keeps only the prefix and the last four characters', () => {
    expect(maskSignature(CANONICAL)).toBe('2019-ETI-EMON-V01-…-0000');
    expect(maskSignature(CANONICAL)).not.toContain('A1B2C3');
  });
});
