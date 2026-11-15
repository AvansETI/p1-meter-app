/**
 * Holiday decoration in the title bar (docs/design/2026-11-14-festive-decoration.md and
 * 2026-11-15-more-festive-seasons.md). All dates are local calendar days.
 */

/** In calendar order; also the order in which overlapping seasons alternate. */
export const SEASONS = [
  'lunarnewyear',
  'sweater',
  'valentine',
  'carnival',
  'eidfitr',
  'holi',
  'nowruz',
  'earthhour',
  'easter',
  'songkran',
  'earthday',
  'kingsday',
  'eidadha',
  'liberation',
  'solstice',
  'ketikoti',
  'pride',
  'halloween',
  'diwali',
  'stmartin',
  'loykrathong',
  'sinterklaas',
  'hanukkah',
  'christmas',
  'newyear',
] as const;
export type Season = (typeof SEASONS)[number];

type Day = [month: number, day: number];
type Span = [start: Day, end: Day];

/**
 * Lunar and lunisolar holidays per year (design §2.1). Where sources differ by a day the span
 * covers both. Extend before the last year runs out; a test fails from 2030 on.
 */
const TABLE: Record<
  'lunarnewyear' | 'eidfitr' | 'holi' | 'eidadha' | 'diwali' | 'loykrathong' | 'hanukkah',
  Record<number, Span>
> = {
  lunarnewyear: {
    2026: [
      [2, 17],
      [2, 19],
    ],
    2027: [
      [2, 6],
      [2, 8],
    ],
    2028: [
      [1, 26],
      [1, 28],
    ],
    2029: [
      [2, 13],
      [2, 15],
    ],
    2030: [
      [2, 3],
      [2, 5],
    ],
  },
  eidfitr: {
    2026: [
      [3, 20],
      [3, 22],
    ],
    2027: [
      [3, 9],
      [3, 12],
    ],
    2028: [
      [2, 26],
      [2, 29],
    ],
    2029: [
      [2, 14],
      [2, 17],
    ],
    2030: [
      [2, 4],
      [2, 7],
    ],
  },
  holi: {
    2026: [
      [3, 3],
      [3, 4],
    ],
    2027: [
      [3, 21],
      [3, 22],
    ],
    2028: [
      [3, 10],
      [3, 11],
    ],
    2029: [
      [2, 28],
      [3, 1],
    ],
    2030: [
      [3, 19],
      [3, 20],
    ],
  },
  eidadha: {
    2026: [
      [5, 27],
      [5, 30],
    ],
    2027: [
      [5, 16],
      [5, 20],
    ],
    2028: [
      [5, 5],
      [5, 8],
    ],
    2029: [
      [4, 24],
      [4, 27],
    ],
    2030: [
      [4, 13],
      [4, 16],
    ],
  },
  diwali: {
    2026: [
      [11, 6],
      [11, 10],
    ],
    2027: [
      [10, 27],
      [10, 31],
    ],
    2028: [
      [10, 15],
      [10, 19],
    ],
    2029: [
      [11, 3],
      [11, 7],
    ],
    2030: [
      [10, 24],
      [10, 28],
    ],
  },
  loykrathong: {
    2026: [
      [11, 24],
      [11, 25],
    ],
    2027: [
      [11, 13],
      [11, 14],
    ],
    2028: [
      [11, 2],
      [11, 2],
    ],
    2029: [
      [11, 21],
      [11, 21],
    ],
    2030: [
      [11, 10],
      [11, 11],
    ],
  },
  // From the first evening to the last day; 2027 runs into January 2028.
  hanukkah: {
    2026: [
      [12, 4],
      [12, 12],
    ],
    2027: [
      [12, 24],
      [13, 1],
    ],
    2028: [
      [12, 12],
      [12, 20],
    ],
    2029: [
      [12, 1],
      [12, 9],
    ],
    2030: [
      [12, 20],
      [12, 28],
    ],
  },
};

/** Last year the table covers. */
export const TABLE_UNTIL = 2030;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight; month 13 is January of the next year. */
const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Easter Sunday (Gregorian; Meeus/Jones/Butcher), local midnight. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return day(year, month, date);
}

/** Koningsdag: 27 April, or 26 April when the 27th is a Sunday. */
export function kingsDay(year: number): Date {
  const date = day(year, 4, 27);
  return date.getDay() === 0 ? day(year, 4, 26) : date;
}

/** The `weekday` (0 = Sunday) on or after a date. */
const onOrAfter = (date: Date, weekday: number) => addDays(date, (weekday - date.getDay() + 7) % 7);

interface Window {
  season: Season;
  start: Date;
  end: Date; // inclusive
}

/** All windows that start in `year`. */
function windowsOf(year: number): Window[] {
  const easter = easterSunday(year);
  const kings = kingsDay(year);
  const prideSaturday = onOrAfter(day(year, 8, 1), 6);
  const lastSaturdayOfMarch = addDays(onOrAfter(day(year, 4, 1), 6), -7);
  const fixed = (season: Season, start: Day, end: Day = start): Window => ({
    season,
    start: day(year, ...start),
    end: day(year, ...end),
  });
  const span = (season: Season, start: Date, end: Date = start): Window => ({ season, start, end });

  const windows: Window[] = [
    span('sweater', onOrAfter(day(year, 2, 1), 5)),
    fixed('valentine', [2, 14]),
    span('carnival', addDays(easter, -50), addDays(easter, -47)),
    fixed('nowruz', [3, 20], [3, 22]),
    span('earthhour', lastSaturdayOfMarch),
    span('easter', addDays(easter, -2), addDays(easter, 1)),
    fixed('songkran', [4, 13], [4, 15]),
    fixed('earthday', [4, 22]),
    span('kingsday', addDays(kings, -1), kings),
    fixed('liberation', [5, 5]),
    fixed('solstice', [6, 21]),
    fixed('ketikoti', [7, 1]),
    span('pride', addDays(prideSaturday, -7), addDays(prideSaturday, 1)),
    fixed('halloween', [10, 25], [10, 31]),
    fixed('stmartin', [11, 11]),
    fixed('sinterklaas', [12, 1], [12, 5]),
    fixed('christmas', [12, 22], [12, 30]),
    fixed('newyear', [12, 31], [13, 2]),
  ];
  for (const [season, years] of Object.entries(TABLE)) {
    const entry = years[year];
    if (entry) windows.push(fixed(season as Season, ...entry));
  }
  return windows;
}

/** All seasons active on the day of `date`, in calendar order. */
export function seasonsAt(date: Date): Season[] {
  const today = day(date.getFullYear(), date.getMonth() + 1, date.getDate());
  // Windows from last year can run into this one (New Year, Chanoeka 2027).
  const active = [...windowsOf(today.getFullYear() - 1), ...windowsOf(today.getFullYear())]
    .filter(({ start, end }) => start <= today && today <= end)
    .map(({ season }) => season);
  return SEASONS.filter((season) => active.includes(season));
}

/** The season for a local date and time, or null; overlapping seasons alternate hourly. */
export function seasonAt(date: Date): Season | null {
  const seasons = seasonsAt(date);
  return seasons.length ? seasons[date.getHours() % seasons.length]! : null;
}

/** Day of Chanoeka (1–8, capped) on `date`, for the number of candles. */
export function hanukkahNight(date: Date): number {
  const today = day(date.getFullYear(), date.getMonth() + 1, date.getDate());
  for (const year of [today.getFullYear() - 1, today.getFullYear()]) {
    const entry = TABLE.hanukkah[year];
    if (!entry) continue;
    const start = day(year, ...entry[0]);
    const nights = Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1;
    if (nights >= 1 && nights <= 9) return Math.min(nights, 8);
  }
  return 8;
}

/** `?festive=` from the URL: a season, 'off', or undefined when absent or invalid. */
export function seasonOverride(search: string): Season | 'off' | undefined {
  const value = new URLSearchParams(search).get('festive');
  if (value === 'off') return 'off';
  return SEASONS.find((season) => season === value);
}

/** The decoration to show: a preview override wins over the setting and the date. */
export function activeSeason({
  override,
  enabled,
  now,
}: {
  override: Season | 'off' | undefined;
  enabled: boolean;
  now: Date;
}): Season | null {
  if (override === 'off') return null;
  if (override) return override;
  return enabled ? seasonAt(now) : null;
}
