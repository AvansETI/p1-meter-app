import { describe, expect, it } from 'vitest';
import { dateLocale, resolveLanguage } from './language';

describe('resolveLanguage', () => {
  it.each([
    [['nl'], 'nl'],
    [['nl-NL', 'en-US'], 'nl'],
    [['nl-BE'], 'nl'],
    [['en-US', 'nl-NL'], 'en'],
    [['de-DE'], 'en'],
    [[], 'en'],
  ] as const)('follows the first device language %j', (device, expected) => {
    expect(resolveLanguage('system', device)).toBe(expected);
  });

  it('uses an explicit choice regardless of the device', () => {
    expect(resolveLanguage('en', ['nl-NL'])).toBe('en');
    expect(resolveLanguage('nl', ['de-DE'])).toBe('nl');
  });

  it('formats English dates in British order', () => {
    expect(dateLocale('nl')).toBe('nl-NL');
    expect(dateLocale('en')).toBe('en-GB');
  });
});
