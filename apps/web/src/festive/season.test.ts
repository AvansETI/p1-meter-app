import { describe, expect, it } from 'vitest';
import { activeSeason, seasonAt, seasonOverride } from './season';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

describe('seasonAt', () => {
  it.each([
    [at(2026, 12, 21, 23, 59), null],
    [at(2026, 12, 22), 'christmas'],
    [at(2026, 12, 25, 12), 'christmas'],
    [at(2026, 12, 30, 23, 59), 'christmas'],
    [at(2026, 12, 31), 'newyear'],
    [at(2027, 1, 1), 'newyear'],
    [at(2027, 1, 2, 23, 59), 'newyear'],
    [at(2027, 1, 3), null],
    [at(2026, 11, 22), null],
    [at(2026, 7, 1), null],
  ])('%s → %s', (date, season) => {
    expect(seasonAt(date)).toBe(season);
  });
});

describe('seasonOverride', () => {
  it('reads a season or off', () => {
    expect(seasonOverride('?festive=christmas')).toBe('christmas');
    expect(seasonOverride('?a=1&festive=newyear')).toBe('newyear');
    expect(seasonOverride('?festive=off')).toBe('off');
  });

  it('ignores a missing or unknown value', () => {
    expect(seasonOverride('')).toBeUndefined();
    expect(seasonOverride('?festive=easter')).toBeUndefined();
  });
});

describe('activeSeason', () => {
  const christmas = at(2026, 12, 24);
  const july = at(2026, 7, 1);

  it('follows the date when enabled', () => {
    expect(activeSeason({ override: undefined, enabled: true, now: christmas })).toBe('christmas');
    expect(activeSeason({ override: undefined, enabled: true, now: july })).toBeNull();
  });

  it('shows nothing when switched off', () => {
    expect(activeSeason({ override: undefined, enabled: false, now: christmas })).toBeNull();
  });

  it('lets a preview override win', () => {
    expect(activeSeason({ override: 'newyear', enabled: false, now: july })).toBe('newyear');
    expect(activeSeason({ override: 'off', enabled: true, now: christmas })).toBeNull();
  });
});
