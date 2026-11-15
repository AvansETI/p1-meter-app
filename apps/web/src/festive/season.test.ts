import { describe, expect, it } from 'vitest';
import {
  TABLE_UNTIL,
  activeSeason,
  easterSunday,
  hanukkahNight,
  kingsDay,
  seasonAt,
  seasonOverride,
  seasonsAt,
} from './season';

const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2028, '2028-04-16'],
    [2029, '2029-04-01'],
    [2030, '2030-04-21'],
    [2038, '2038-04-25'],
  ])('%i → %s', (year, date) => {
    expect(iso(easterSunday(year))).toBe(date);
  });
});

describe('kingsDay', () => {
  it('is 27 April, or 26 April when the 27th is a Sunday', () => {
    expect(iso(kingsDay(2026))).toBe('2026-04-27');
    expect(iso(kingsDay(2025))).toBe('2025-04-26');
  });
});

describe('seasonAt: boundaries', () => {
  it.each([
    // Christmas and New Year
    [at(2026, 12, 21, 23, 59), null],
    [at(2026, 12, 22, 0, 0), 'christmas'],
    [at(2026, 12, 30, 23, 59), 'christmas'],
    [at(2026, 12, 31, 0, 0), 'newyear'],
    [at(2027, 1, 2, 23, 59), 'newyear'],
    [at(2027, 1, 3, 0, 0), null],
    // Fixed dates
    [at(2027, 2, 14), 'valentine'],
    [at(2027, 3, 20), 'nowruz'],
    [at(2027, 3, 23), null],
    [at(2027, 4, 13), 'songkran'],
    [at(2027, 4, 15), 'songkran'],
    [at(2027, 4, 22), 'earthday'],
    [at(2027, 5, 4), null], // Remembrance Day: no decoration
    [at(2027, 5, 5), 'liberation'],
    [at(2027, 6, 21), 'solstice'],
    [at(2027, 7, 1), 'ketikoti'],
    [at(2026, 10, 24), null],
    [at(2026, 10, 25), 'halloween'],
    [at(2026, 10, 31), 'halloween'],
    [at(2026, 11, 11), 'stmartin'],
    [at(2027, 12, 1), 'sinterklaas'],
    [at(2027, 12, 5), 'sinterklaas'],
    [at(2027, 12, 6), null],
    // Easter-based (2027: Easter 28 March)
    [at(2027, 2, 4), null],
    [at(2027, 2, 9), 'carnival'],
    [at(2027, 2, 10), null], // Ash Wednesday
    [at(2027, 3, 26), 'easter'],
    [at(2027, 3, 29), 'easter'],
    [at(2027, 3, 30), null],
    // Rules
    [at(2027, 2, 5), 'sweater'],
    [at(2026, 2, 6), 'sweater'], // first Friday of February 2026
    [at(2026, 3, 28), 'earthhour'], // last Saturday of March 2026
    [at(2026, 4, 26), 'kingsday'], // Koningsnacht
    [at(2026, 4, 27), 'kingsday'],
    [at(2026, 4, 28), null],
    [at(2025, 4, 25), 'kingsday'], // 27 April 2025 was a Sunday
    [at(2025, 4, 27), null],
    [at(2027, 7, 31), 'pride'], // Saturday before the first Saturday of August
    [at(2027, 8, 8), 'pride'], // Sunday after the Canal Parade (7 August)
    [at(2027, 8, 9), null],
    // Table seasons
    [at(2027, 3, 12), 'eidfitr'],
    [at(2027, 5, 16), 'eidadha'],
    [at(2026, 3, 3), 'holi'],
    [at(2026, 11, 8), 'diwali'],
    [at(2026, 11, 24), 'loykrathong'],
    [at(2026, 12, 12), 'hanukkah'],
  ])('%s → %s', (date, season) => {
    expect(seasonAt(date)).toBe(season);
  });
});

describe('overlaps', () => {
  it('lists every active season in calendar order', () => {
    // 2027: Chinese New Year 6–8 February and carnival 6–9 February.
    expect(seasonsAt(at(2027, 2, 6))).toEqual(['lunarnewyear', 'carnival']);
    // Chanoeka 2027 runs over Christmas and New Year into 2028.
    expect(seasonsAt(at(2027, 12, 25))).toEqual(['hanukkah', 'christmas']);
    expect(seasonsAt(at(2028, 1, 1))).toEqual(['hanukkah', 'newyear']);
    // 2038: Easter Monday is Koningsnacht.
    expect(seasonsAt(at(2038, 4, 26))).toEqual(['easter', 'kingsday']);
  });

  it('alternates every hour', () => {
    expect(seasonAt(at(2027, 2, 6, 10))).toBe('lunarnewyear');
    expect(seasonAt(at(2027, 2, 6, 11))).toBe('carnival');
    expect(seasonAt(at(2027, 2, 6, 12))).toBe('lunarnewyear');
  });
});

describe('hanukkahNight', () => {
  it('lights one more candle each evening, eight at most', () => {
    expect(hanukkahNight(at(2026, 12, 4))).toBe(1);
    expect(hanukkahNight(at(2026, 12, 7))).toBe(4);
    expect(hanukkahNight(at(2026, 12, 11))).toBe(8);
    expect(hanukkahNight(at(2026, 12, 12))).toBe(8);
    expect(hanukkahNight(at(2028, 1, 1))).toBe(8);
    // Outside Chanoeka (a preview): all candles.
    expect(hanukkahNight(at(2026, 7, 1))).toBe(8);
  });
});

describe('table', () => {
  it('covers the coming year', () => {
    // Fails from 2030 on: add the next years to the table in season.ts.
    expect(TABLE_UNTIL).toBeGreaterThan(new Date().getFullYear());
  });
});

describe('seasonOverride', () => {
  it('reads a season or off', () => {
    expect(seasonOverride('?festive=christmas')).toBe('christmas');
    expect(seasonOverride('?a=1&festive=hanukkah')).toBe('hanukkah');
    expect(seasonOverride('?festive=off')).toBe('off');
  });

  it('ignores a missing or unknown value', () => {
    expect(seasonOverride('')).toBeUndefined();
    expect(seasonOverride('?festive=birthday')).toBeUndefined();
  });
});

describe('activeSeason', () => {
  const christmas = at(2026, 12, 24);
  const quiet = at(2026, 9, 1);

  it('follows the date when enabled', () => {
    expect(activeSeason({ override: undefined, enabled: true, now: christmas })).toBe('christmas');
    expect(activeSeason({ override: undefined, enabled: true, now: quiet })).toBeNull();
  });

  it('shows nothing when switched off', () => {
    expect(activeSeason({ override: undefined, enabled: false, now: christmas })).toBeNull();
  });

  it('lets a preview override win', () => {
    expect(activeSeason({ override: 'newyear', enabled: false, now: quiet })).toBe('newyear');
    expect(activeSeason({ override: 'off', enabled: true, now: christmas })).toBeNull();
  });
});
