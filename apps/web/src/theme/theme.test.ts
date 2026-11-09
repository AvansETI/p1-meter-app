import { describe, expect, it } from 'vitest';
import { isDark } from './theme';

describe('isDark', () => {
  it.each([
    ['dark', false, true],
    ['light', true, false],
    ['system', true, true],
    ['system', false, false],
  ] as const)('theme %s with system dark=%s → %s', (theme, systemDark, expected) => {
    expect(isDark(theme, systemDark)).toBe(expected);
  });
});
