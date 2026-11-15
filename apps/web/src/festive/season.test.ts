import { describe, expect, it } from 'vitest';
import {
  TABLE_UNTIL,
  adventCandles,
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

describe('seasonsAt: boundaries', () => {
  // [date, season, active on that date]
  it.each([
    [at(2026, 12, 21, 23, 59), 'christmas', false],
    [at(2026, 12, 22, 0, 0), 'christmas', true],
    [at(2026, 12, 30, 23, 59), 'christmas', true],
    [at(2026, 12, 31, 0, 0), 'newyear', true],
    [at(2027, 1, 2, 23, 59), 'newyear', true],
    [at(2027, 1, 3, 0, 0), 'newyear', false],
    [at(2027, 2, 14), 'valentine', true],
    [at(2027, 3, 20), 'nowruz', true],
    [at(2027, 3, 23), 'nowruz', false],
    [at(2027, 4, 13), 'songkran', true],
    [at(2027, 4, 15), 'songkran', true],
    [at(2027, 4, 22), 'earthday', true],
    [at(2027, 5, 4), 'liberation', false], // Remembrance Day
    [at(2027, 5, 5), 'liberation', true],
    [at(2027, 6, 21), 'solstice', true],
    [at(2027, 7, 1), 'ketikoti', true],
    [at(2026, 10, 24), 'halloween', false],
    [at(2026, 10, 25), 'halloween', true],
    [at(2026, 10, 31), 'halloween', true],
    [at(2026, 11, 11), 'stmartin', true],
    [at(2026, 11, 11), 'elevenelven', true],
    [at(2027, 12, 1), 'sinterklaas', true],
    [at(2027, 12, 5), 'sinterklaas', true],
    [at(2027, 12, 6), 'sinterklaas', false],
    // Easter-based (2027: Easter 28 March)
    [at(2027, 2, 4), 'carnival', false],
    [at(2027, 2, 9), 'carnival', true],
    [at(2027, 2, 10), 'carnival', false], // Ash Wednesday
    [at(2027, 3, 26), 'easter', true],
    [at(2027, 3, 29), 'easter', true],
    [at(2027, 3, 30), 'easter', false],
    [at(2027, 5, 6), 'ascension', true],
    [at(2027, 5, 16), 'pentecost', true],
    [at(2027, 5, 17), 'pentecost', true],
    // Rules
    [at(2027, 2, 5), 'sweater', true], // first Friday of February 2027
    [at(2026, 3, 28), 'earthhour', true], // last Saturday of March 2026
    [at(2026, 4, 26), 'kingsday', true], // Koningsnacht
    [at(2026, 4, 27), 'kingsday', true],
    [at(2026, 4, 28), 'kingsday', false],
    [at(2025, 4, 25), 'kingsday', true], // 27 April 2025 was a Sunday
    [at(2025, 4, 27), 'kingsday', false],
    [at(2027, 4, 23), 'kingsgames', true], // last Friday before King's Day
    [at(2027, 7, 31), 'pride', true], // Saturday before the first Saturday of August
    [at(2027, 8, 8), 'pride', true], // Sunday after the Canal Parade (7 August)
    [at(2027, 8, 9), 'pride', false],
    [at(2027, 9, 21), 'prinsjesdag', true], // third Tuesday of September
    [at(2027, 12, 10), 'purplefriday', true], // second Friday of December
    [at(2027, 5, 9), 'mothersday', true], // second Sunday of May
    [at(2027, 6, 20), 'fathersday', true], // third Sunday of June
    [at(2027, 7, 20), 'fourdays', true], // third Tuesday of July
    [at(2027, 7, 23), 'fourdays', true],
    [at(2027, 9, 13), 'programmersday', true], // 256th day
    [at(2028, 9, 12), 'programmersday', true], // leap year
    [at(2026, 11, 14), 'arrival', true], // Saturday between 12 and 18 November
    [at(2026, 11, 15), 'sinttime', true],
    [at(2026, 3, 29), 'clockchange', true], // last Sunday of March
    [at(2026, 10, 25), 'clockchange', true], // last Sunday of October
    [at(2027, 10, 6), 'childrensbookweek', true], // first Wednesday of October, 12 days
    [at(2027, 10, 17), 'childrensbookweek', true],
    [at(2027, 10, 18), 'childrensbookweek', false],
    // Table seasons
    [at(2027, 3, 12), 'eidfitr', true],
    [at(2027, 5, 16), 'eidadha', true],
    [at(2026, 3, 3), 'holi', true],
    [at(2026, 11, 8), 'diwali', true],
    [at(2026, 11, 24), 'loykrathong', true],
    [at(2026, 12, 12), 'hanukkah', true],
    [at(2027, 4, 22), 'passover', true],
    [at(2027, 10, 2), 'roshhashanah', true],
    [at(2027, 9, 15), 'midautumn', true],
    [at(2027, 5, 20), 'vesak', true],
    [at(2027, 7, 15), 'summerbreak', true],
  ] as const)('%s: %s %s', (date, season, active) => {
    expect(seasonsAt(date).includes(season)).toBe(active);
  });
});

describe('levels', () => {
  it('fills every day of the year with at least the time of year', () => {
    for (
      let d = at(2027, 1, 1);
      d.getFullYear() === 2027;
      d = at(2027, d.getMonth() + 1, d.getDate() + 1)
    ) {
      expect(seasonsAt(d).length).toBeGreaterThan(0);
    }
  });

  it('shows the time of year only when nothing else is on', () => {
    expect(seasonsAt(at(2027, 1, 20))).toEqual(['dryjanuary']);
    expect(seasonsAt(at(2027, 5, 28))).toEqual(['spring']);
    expect(seasonsAt(at(2027, 12, 21))).toEqual(['shortestday']);
  });

  it('lets a holiday win over a month-long season', () => {
    // Valentine's Day 2027 falls in Ramadan.
    expect(seasonsAt(at(2027, 2, 14))).toEqual(['valentine']);
    // Halfway Ramadan, nothing else: Ramadan.
    expect(seasonsAt(at(2027, 2, 24))).toEqual(['ramadan', 'springbreak']);
  });
});

describe('adventCandles', () => {
  it('lights one more candle each Advent Sunday', () => {
    // Advent 2026 starts on Sunday 29 November.
    expect(adventCandles(at(2026, 11, 29))).toBe(1);
    expect(adventCandles(at(2026, 12, 5))).toBe(1);
    expect(adventCandles(at(2026, 12, 6))).toBe(2);
    expect(adventCandles(at(2026, 12, 20))).toBe(4);
    expect(adventCandles(at(2026, 7, 1))).toBe(4);
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
  const quiet = at(2027, 5, 28); // nothing but spring

  it('follows the date when enabled', () => {
    expect(activeSeason({ override: undefined, enabled: true, now: christmas })).toBe('christmas');
    expect(activeSeason({ override: undefined, enabled: true, now: quiet })).toBe('spring');
  });

  it('shows nothing when switched off', () => {
    expect(activeSeason({ override: undefined, enabled: false, now: christmas })).toBeNull();
  });

  it('lets a preview override win', () => {
    expect(activeSeason({ override: 'newyear', enabled: false, now: quiet })).toBe('newyear');
    expect(activeSeason({ override: 'off', enabled: true, now: christmas })).toBeNull();
  });
});
