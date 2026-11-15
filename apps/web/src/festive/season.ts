/**
 * Holiday decoration in the title bar (docs/design/2026-11-14-festive-decoration.md and
 * 2026-11-15-more-festive-seasons.md). All dates are local calendar days.
 */

/**
 * Ambient seasons first, then month-long quiet seasons, then holidays in calendar order; the
 * order in which overlapping seasons alternate.
 */
export const SEASONS = [
  'winter',
  'spring',
  'summer',
  'autumn',
  'dryjanuary',
  'bulbtime',
  'movember',
  'ramadan',
  'advent',
  'sinttime',
  'football',
  'springbreak',
  'maybreak',
  'summerbreak',
  'autumnbreak',
  'epiphany',
  'tulipday',
  'poetryday',
  'birdcount',
  'cleanenergyday',
  'candlemas',
  'wetlandsday',
  'lunarnewyear',
  'sweater',
  'valentine',
  'carnival',
  'efficiencyday',
  'piday',
  'womensday',
  'booksweek',
  'eidfitr',
  'holi',
  'cleanupday',
  'treeday',
  'nowruz',
  'waterday',
  'earthhour',
  'clockchange',
  'aprilfools',
  'passover',
  'easter',
  'healthday',
  'songkran',
  'artday',
  'earthday',
  'bookday',
  'kingsgames',
  'kingsday',
  'eidadha',
  'liberation',
  'sunday',
  'europeday',
  'nursesday',
  'millday',
  'mothersday',
  'ascension',
  'idahot',
  'museumday',
  'beeday',
  'biodiversityday',
  'towelday',
  'vesak',
  'pentecost',
  'childrensday',
  'bikeday',
  'environmentday',
  'oceansday',
  'flagday',
  'windday',
  'picnicday',
  'refugeeday',
  'fathersday',
  'solstice',
  'ketikoti',
  'emojiday',
  'fourdays',
  'friendshipday',
  'pride',
  'perseids',
  'schoolstart',
  'evday',
  'monumentday',
  'programmersday',
  'roshhashanah',
  'prinsjesdag',
  'peaceweek',
  'midautumn',
  'neighboursday',
  'languagesday',
  'tourismday',
  'heartday',
  'eldersday',
  'childrensbookweek',
  'animalday',
  'teachersday',
  'hydrogenday',
  'sustainabilityday',
  'foodday',
  'halloween',
  'nightofthenight',
  'diwali',
  'natureday',
  'glow',
  'carersday',
  'elevenelven',
  'stmartin',
  'arrival',
  'loykrathong',
  'sinterklaas',
  'hanukkah',
  'volunteersday',
  'purplefriday',
  'shortestday',
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
  | 'ramadan'
  | 'football'
  | 'springbreak'
  | 'maybreak'
  | 'summerbreak'
  | 'autumnbreak'
  | 'lunarnewyear'
  | 'eidfitr'
  | 'holi'
  | 'eidadha'
  | 'diwali'
  | 'loykrathong'
  | 'hanukkah'
  | 'passover'
  | 'vesak'
  | 'roshhashanah'
  | 'midautumn',
  Record<number, Span>
> = {
  // Men's and women's European and World Cups; add Women's Euro 2029 and the 2030 World Cup
  // once their dates are published.
  football: {
    2026: [
      [6, 11],
      [7, 19],
    ],
    2027: [
      [6, 24],
      [7, 25],
    ],
    2028: [
      [6, 9],
      [7, 9],
    ],
  },
  // School holidays: from the first region's start to the last region's end (Rijksoverheid;
  // the 2026 spring and summer holidays had passed when this was added).
  springbreak: {
    2027: [
      [2, 13],
      [2, 28],
    ],
    2028: [
      [2, 19],
      [3, 5],
    ],
    2029: [
      [2, 10],
      [2, 25],
    ],
    2030: [
      [2, 16],
      [3, 3],
    ],
  },
  maybreak: {
    2027: [
      [4, 24],
      [5, 2],
    ],
    2028: [
      [4, 29],
      [5, 7],
    ],
    2029: [
      [4, 28],
      [5, 6],
    ],
    2030: [
      [4, 27],
      [5, 5],
    ],
  },
  summerbreak: {
    2027: [
      [7, 10],
      [9, 5],
    ],
    2028: [
      [7, 8],
      [9, 3],
    ],
    2029: [
      [7, 7],
      [9, 2],
    ],
    2030: [
      [7, 6],
      [9, 1],
    ],
  },
  autumnbreak: {
    2026: [
      [10, 10],
      [10, 25],
    ],
    2027: [
      [10, 16],
      [10, 31],
    ],
    2028: [
      [10, 14],
      [10, 29],
    ],
    2029: [
      [10, 13],
      [10, 28],
    ],
  },
  // First evening … last day (eight days in the diaspora).
  passover: {
    2026: [
      [4, 1],
      [4, 9],
    ],
    2027: [
      [4, 21],
      [4, 29],
    ],
    2028: [
      [4, 10],
      [4, 18],
    ],
    2029: [
      [3, 30],
      [4, 7],
    ],
    2030: [
      [4, 17],
      [4, 25],
    ],
  },
  // Theravada (Thai) dates.
  vesak: {
    2026: [
      [5, 31],
      [6, 1],
    ],
    2027: [
      [5, 20],
      [5, 20],
    ],
    2028: [
      [5, 8],
      [5, 8],
    ],
    2029: [
      [5, 27],
      [5, 27],
    ],
    2030: [
      [5, 16],
      [5, 17],
    ],
  },
  // First evening … second day.
  roshhashanah: {
    2026: [
      [9, 11],
      [9, 13],
    ],
    2027: [
      [10, 1],
      [10, 3],
    ],
    2028: [
      [9, 20],
      [9, 22],
    ],
    2029: [
      [9, 9],
      [9, 11],
    ],
    2030: [
      [9, 27],
      [9, 29],
    ],
  },
  midautumn: {
    2026: [
      [9, 25],
      [9, 25],
    ],
    2027: [
      [9, 15],
      [9, 15],
    ],
    2028: [
      [10, 3],
      [10, 3],
    ],
    2029: [
      [9, 22],
      [9, 22],
    ],
    2030: [
      [9, 12],
      [9, 12],
    ],
  },
  // Until the day before the earliest expected Suikerfeest.
  ramadan: {
    2026: [
      [2, 18],
      [3, 19],
    ],
    2027: [
      [2, 8],
      [3, 8],
    ],
    2028: [
      [1, 27],
      [2, 25],
    ],
    2029: [
      [1, 15],
      [2, 13],
    ],
    2030: [
      [1, 5],
      [2, 3],
    ],
  },
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
  /** The `n`th `weekday` (0 = Sunday) of a month. */
  const nth = (month: number, weekday: number, n: number) =>
    addDays(onOrAfter(day(year, month, 1), weekday), 7 * (n - 1));
  const bookWeek = onOrAfter(day(year, 10, 1), 3);
  const lastSaturdayOfMarch = addDays(onOrAfter(day(year, 4, 1), 6), -7);
  const lastSaturdayOfOctober = addDays(onOrAfter(day(year, 11, 1), 6), -7);
  const lastSundayOf = (month: number) => addDays(onOrAfter(day(year, month + 1, 1), 0), -7);
  const lastThursdayOfJanuary = addDays(onOrAfter(day(year, 2, 1), 4), -7);
  const arrival = onOrAfter(day(year, 11, 12), 6);
  const booksWeek = nth(3, 3, 2); // CPNB 2026: Wednesday 11 – Sunday 22 March
  const peaceWeek = onOrAfter(day(year, 9, 15), 6); // PAX 2026: 19–27 September
  const glow = onOrAfter(day(year, 11, 7), 6); // GLOW 2023–2026: eight evenings from a Saturday
  const birdCount = addDays(onOrAfter(day(year, 2, 1), 0), -7); // last Sunday of January
  // Advent starts on the fourth Sunday before Christmas.
  const advent = addDays(onOrAfter(day(year, 12, 25), 0), -28);
  const fixed = (season: Season, start: Day, end: Day = start): Window => ({
    season,
    start: day(year, ...start),
    end: day(year, ...end),
  });
  const span = (season: Season, start: Date, end: Date = start): Window => ({ season, start, end });

  const windows: Window[] = [
    fixed('winter', [1, 1], [3, 19]),
    fixed('spring', [3, 20], [6, 20]),
    fixed('summer', [6, 21], [9, 22]),
    fixed('autumn', [9, 23], [12, 20]),
    fixed('winter', [12, 21], [12, 31]),
    fixed('dryjanuary', [1, 1], [1, 31]),
    fixed('movember', [11, 1], [11, 30]),
    // Keukenhof and the bulb fields.
    fixed('bulbtime', [3, 20], [5, 10]),
    span('advent', advent, day(year, 12, 21)),
    span('sinttime', addDays(arrival, 1), day(year, 12, 5)),
    fixed('epiphany', [1, 6]),
    span('tulipday', nth(1, 6, 3)),
    span('poetryday', lastThursdayOfJanuary),
    fixed('cleanenergyday', [1, 26]),
    span('birdcount', addDays(birdCount, -2), birdCount),
    fixed('candlemas', [2, 2]),
    fixed('wetlandsday', [2, 2]),
    span('sweater', onOrAfter(day(year, 2, 1), 5)),
    fixed('valentine', [2, 14]),
    span('carnival', addDays(easter, -50), addDays(easter, -47)),
    fixed('efficiencyday', [3, 5]),
    fixed('piday', [3, 14]),
    fixed('womensday', [3, 8]),
    span('booksweek', booksWeek, addDays(booksWeek, 11)),
    span('cleanupday', onOrAfter(day(year, 3, 16), 6)),
    span('treeday', nth(3, 3, 3)),
    fixed('nowruz', [3, 20], [3, 22]),
    fixed('waterday', [3, 22]),
    span('earthhour', lastSaturdayOfMarch),
    span('clockchange', lastSundayOf(3)),
    span('clockchange', lastSundayOf(10)),
    fixed('aprilfools', [4, 1]),
    span('easter', addDays(easter, -2), addDays(easter, 1)),
    fixed('healthday', [4, 7]),
    fixed('songkran', [4, 13], [4, 15]),
    fixed('artday', [4, 15]),
    fixed('earthday', [4, 22]),
    fixed('bookday', [4, 23]),
    // Schools' sports day on the last Friday before Koningsdag (some schools move it).
    span('kingsgames', onOrAfter(addDays(kings, -7), 5)),
    span('kingsday', addDays(kings, -1), kings),
    fixed('liberation', [5, 5]),
    fixed('sunday', [5, 3]),
    fixed('europeday', [5, 9]),
    fixed('nursesday', [5, 12]),
    span('millday', nth(5, 6, 2)),
    span('mothersday', nth(5, 0, 2)),
    span('ascension', addDays(easter, 39)),
    fixed('idahot', [5, 17]),
    fixed('museumday', [5, 18]),
    fixed('beeday', [5, 20]),
    fixed('biodiversityday', [5, 22]),
    fixed('towelday', [5, 25]),
    span('pentecost', addDays(easter, 49), addDays(easter, 50)),
    fixed('childrensday', [6, 1]),
    fixed('bikeday', [6, 3]),
    fixed('environmentday', [6, 5]),
    fixed('oceansday', [6, 8]),
    span('flagday', nth(6, 6, 2)),
    fixed('windday', [6, 15]),
    fixed('picnicday', [6, 18]),
    fixed('refugeeday', [6, 20]),
    span('fathersday', nth(6, 0, 3)),
    fixed('solstice', [6, 21]),
    fixed('ketikoti', [7, 1]),
    fixed('emojiday', [7, 17]),
    fixed('friendshipday', [7, 30]),
    // Nijmegen Four Days Marches: Tuesday to Friday of the third week of July.
    span('fourdays', nth(7, 2, 3), addDays(nth(7, 2, 3), 3)),
    span('pride', addDays(prideSaturday, -7), addDays(prideSaturday, 1)),
    fixed('perseids', [8, 12], [8, 13]),
    span('schoolstart', nth(9, 1, 1)),
    fixed('evday', [9, 9]),
    // Day of the Programmer: the 256th day of the year.
    span('programmersday', addDays(day(year, 1, 1), 255)),
    span('monumentday', nth(9, 6, 2), addDays(nth(9, 6, 2), 1)),
    span('prinsjesdag', nth(9, 2, 3)),
    span('peaceweek', peaceWeek, addDays(peaceWeek, 8)),
    span('neighboursday', nth(9, 6, 4)),
    fixed('languagesday', [9, 26]),
    fixed('tourismday', [9, 27]),
    fixed('heartday', [9, 29]),
    fixed('eldersday', [10, 1]),
    span('childrensbookweek', bookWeek, addDays(bookWeek, 11)),
    fixed('animalday', [10, 4]),
    fixed('teachersday', [10, 5]),
    fixed('hydrogenday', [10, 8]),
    fixed('sustainabilityday', [10, 10]),
    fixed('foodday', [10, 16]),
    fixed('halloween', [10, 25], [10, 31]),
    span('nightofthenight', lastSaturdayOfOctober),
    span('natureday', nth(11, 6, 1)),
    span('glow', glow, addDays(glow, 7)),
    fixed('carersday', [11, 10]),
    fixed('elevenelven', [11, 11]),
    fixed('stmartin', [11, 11]),
    // The national arrival: the Saturday between 12 and 18 November (2021–2025 all fit).
    span('arrival', arrival),
    fixed('sinterklaas', [12, 1], [12, 5]),
    fixed('volunteersday', [12, 7]),
    span('purplefriday', nth(12, 5, 2)),
    fixed('shortestday', [12, 21]),
    fixed('christmas', [12, 22], [12, 30]),
    fixed('newyear', [12, 31], [13, 2]),
  ];
  for (const [season, years] of Object.entries(TABLE)) {
    const entry = years[year];
    if (entry) windows.push(fixed(season as Season, ...entry));
  }
  return windows;
}

/** 0: holidays; 1: month-long seasons that give way to holidays; 2: the time of year. */
const LEVEL: Partial<Record<Season, 1 | 2>> = {
  ramadan: 1,
  bulbtime: 1,
  dryjanuary: 1,
  movember: 1,
  springbreak: 1,
  maybreak: 1,
  summerbreak: 1,
  autumnbreak: 1,
  advent: 1,
  sinttime: 1,
  football: 1,
  winter: 2,
  spring: 2,
  summer: 2,
  autumn: 2,
};
const level = (season: Season) => LEVEL[season] ?? 0;

/** The seasons to show on the day of `date`, in calendar order (see LEVEL). */
export function seasonsAt(date: Date): Season[] {
  const today = day(date.getFullYear(), date.getMonth() + 1, date.getDate());
  // Windows from last year can run into this one (New Year, Chanoeka 2027).
  const active = [...windowsOf(today.getFullYear() - 1), ...windowsOf(today.getFullYear())]
    .filter(({ start, end }) => start <= today && today <= end)
    .map(({ season }) => season);
  const seasons = SEASONS.filter((season) => active.includes(season));
  // Only the most specific level is shown: a holiday over Ramadan, Ramadan over winter.
  const top = Math.min(...seasons.map(level));
  return seasons.filter((season) => level(season) === top);
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

/** Advent candles lit on `date`: one per Advent Sunday so far (1–4); 4 outside Advent. */
export function adventCandles(date: Date): number {
  const today = day(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const first = addDays(onOrAfter(day(today.getFullYear(), 12, 25), 0), -28);
  const days = Math.round((today.getTime() - first.getTime()) / DAY_MS);
  return days < 0 || days > 27 ? 4 : Math.floor(days / 7) + 1;
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
