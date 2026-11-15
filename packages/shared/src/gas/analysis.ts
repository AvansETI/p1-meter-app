/**
 * Gas analysis against degree days (docs/design/2026-11-15-gas-analysis.md §3). Pure functions
 * on local calendar days; the API feeds them and the web app only draws the results.
 */
import {
  addDays,
  formatPlainDate,
  isoWeek,
  parsePlainDate,
  periodStart,
  type PlainDate,
} from '../calendar';
import { degreeDays, type DegreeDayMethod } from './degreeDays';

/** One local day: gas use and the day's mean weather, each null when unknown. */
export interface GasDay {
  day: string;
  m3: number | null;
  t: number | null;
  fh: number | null;
}

export interface RatedDay extends GasDay {
  dd: number | null;
}

export interface HeatingLine {
  /** m³ per degree day. */
  slope: number;
  /** m³ per day at zero degree days. */
  intercept: number;
  r2: number;
  n: number;
}

/** Days used for the baseline and the heating line: the last year of data. */
export const RECENT_DAYS = 365;
/** Fewer heating-free days than this: the baseline comes from the heating line instead. */
const MIN_BASELINE_DAYS = 10;
const MIN_LINE_DAYS = 10;
/** Periods with fewer degree days than this are left out of m³ per degree day (§3.4). */
export const MIN_PERIOD_DEGREE_DAYS = 10;
/** A calendar year with fewer days of data is marked incomplete (§3.5). */
export const COMPLETE_YEAR_DAYS = 300;

const plain = (day: string): PlainDate => parsePlainDate(day)!;

export function rateDays(days: GasDay[], base: number, method: DegreeDayMethod): RatedDay[] {
  return days.map((d) => ({
    ...d,
    dd:
      d.t === null || d.fh === null
        ? null
        : degreeDays({ t: d.t, fh: d.fh }, plain(d.day).month, base, method),
  }));
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const recent = <T>(days: T[]) => days.slice(-RECENT_DAYS);

/** Below this share of days with some gas, the household does not cook or heat water on gas. */
const MIN_USE_SHARE = 0.2;

/**
 * Median gas of days without heating demand (mean temperature at or above the base). Days
 * without any gas are left out: they are almost always days nobody was home (holidays). When
 * nearly all such days are zero, there is no base load. Looks back further than a year when
 * the last year has too few warm days; null when there are still too few.
 */
export function autoBaseline(days: GasDay[], base: number): number | null {
  return warmMedian(recent(days), base) ?? warmMedian(days, base);
}

/**
 * The automatic baseline per month (`YYYY-MM`), from the warm days of the 12 months up to and
 * including that month: it follows changing habits (cooking, showers, a new boiler) without
 * jumping from one year to the next. Months with too few warm days in their window are
 * missing.
 */
export function autoBaselineByMonth(days: GasDay[], base: number): Map<string, number> {
  const months = [...new Set(days.map((d) => d.day.slice(0, 7)))].sort();
  const result = new Map<string, number>();
  for (const month of months) {
    const [year, m] = month.split('-').map(Number) as [number, number];
    const first = formatPlainDate({
      year: m === 12 ? year : year - 1,
      month: (m % 12) + 1,
      day: 1,
    });
    const window = days.filter((d) => d.day >= first && d.day.slice(0, 7) <= month);
    const value = warmMedian(window, base);
    if (value !== null) result.set(month, value);
  }
  return result;
}

function warmMedian(days: GasDay[], base: number): number | null {
  const values = days.filter((d) => d.m3 !== null && d.t !== null && d.t >= base).map((d) => d.m3!);
  if (values.length < MIN_BASELINE_DAYS) return null;
  const used = values.filter((m3) => m3 > 0);
  if (used.length < values.length * MIN_USE_SHARE) return 0;
  return median(used);
}

/** Least-squares line of gas against degree days over the heating days of the last year. */
export function heatingLine(days: RatedDay[]): HeatingLine | null {
  const points = recent(days).filter((d) => d.m3 !== null && d.dd !== null && d.dd > 0);
  const n = points.length;
  if (n < MIN_LINE_DAYS) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.dd!;
    sy += p.m3!;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.dd! - mx) ** 2;
    sxy += (p.dd! - mx) * (p.m3! - my);
    syy += (p.m3! - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept: my - slope * mx, r2, n };
}

export type BaselineSource = 'auto' | 'line' | 'manual' | 'off';

/** The baseline in use: off without gas cooking, else manual, automatic or the line's intercept. */
export function chooseBaseline(options: {
  cooking: boolean;
  manual?: number | undefined;
  auto: number | null;
  line: HeatingLine | null;
}): { value: number; source: BaselineSource } {
  if (!options.cooking) return { value: 0, source: 'off' };
  if (options.manual !== undefined) return { value: options.manual, source: 'manual' };
  if (options.auto !== null) return { value: options.auto, source: 'auto' };
  if (options.line) return { value: Math.max(0, options.line.intercept), source: 'line' };
  return { value: 0, source: 'auto' };
}

export type GasPeriodKind = 'week' | 'month' | 'year';

export interface GasPeriod {
  /** First day of the period (YYYY-MM-DD). */
  start: string;
  /** Label key: `2026-W03`, `2026-01` or `2026`. */
  key: string;
  /** Days with both gas and weather. */
  days: number;
  m3: number;
  dd: number;
  /** Heating gas per degree day; null below the minimum number of degree days. */
  perDd: number | null;
}

function periodKey(date: PlainDate, kind: GasPeriodKind): string {
  if (kind === 'year') return String(date.year);
  if (kind === 'month') return formatPlainDate(date).slice(0, 7);
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** One baseline (m³/day) for all time, or one per day (`YYYY-MM-DD`). */
export type Baseline = number | ((day: string) => number);

const baselineOn = (baseline: Baseline, day: string) =>
  typeof baseline === 'number' ? baseline : baseline(day);

/** Heating gas per degree day per week, month or year (§3.4). */
export function periods(days: RatedDay[], baseline: Baseline, kind: GasPeriodKind): GasPeriod[] {
  const result = new Map<string, GasPeriod>();
  /** Baseline gas per period: the sum of each day's baseline. */
  const baseGas = new Map<string, number>();
  for (const d of days) {
    if (d.m3 === null || d.dd === null) continue;
    const date = plain(d.day);
    const key = periodKey(date, kind);
    let period = result.get(key);
    if (!period) {
      period = {
        start: formatPlainDate(periodStart(date, kind)),
        key,
        days: 0,
        m3: 0,
        dd: 0,
        perDd: null,
      };
      result.set(key, period);
    }
    period.days++;
    period.m3 += d.m3;
    period.dd += d.dd;
    baseGas.set(key, (baseGas.get(key) ?? 0) + baselineOn(baseline, d.day));
  }
  return [...result.values()].map((p) => ({
    ...p,
    perDd: p.dd >= MIN_PERIOD_DEGREE_DAYS ? Math.max(0, p.m3 - baseGas.get(p.key)!) / p.dd : null,
  }));
}

/**
 * Consumption over `periodDays` days of normal weather: the baseline for every day plus the
 * heating gas of the measured days scaled from their degree days to the normal (§3.5).
 */
export function normalised(
  measured: { days: number; m3: number; dd: number },
  baseline: number,
  normalDd: number,
  periodDays: number,
): number | null {
  if (measured.days === 0 || measured.dd <= 0) return null;
  const heating = Math.max(0, measured.m3 - baseline * measured.days);
  return baseline * periodDays + (heating * normalDd) / measured.dd;
}

export interface GasYear {
  year: number;
  days: number;
  m3: number;
  dd: number;
  corrected: number | null;
  complete: boolean;
  /** Mean baseline over the measured days of this year, m³/day. */
  baseline: number;
}

const daysInYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

/** Actual and weather-corrected consumption per calendar year (§3.5). */
export function yearSummaries(days: RatedDay[], baseline: Baseline, normalDd: number): GasYear[] {
  const baseSum = new Map<string, number>();
  for (const d of days) {
    if (d.m3 === null || d.dd === null) continue;
    const year = d.day.slice(0, 4);
    baseSum.set(year, (baseSum.get(year) ?? 0) + baselineOn(baseline, d.day));
  }
  return periods(days, baseline, 'year').map((p) => {
    const year = Number(p.key);
    const base = baseSum.get(p.key)! / p.days;
    return {
      year,
      days: p.days,
      m3: p.m3,
      dd: p.dd,
      corrected: normalised(p, base, normalDd, daysInYear(year)),
      complete: p.days >= COMPLETE_YEAR_DAYS,
      baseline: base,
    };
  });
}

/** Normal degree days per calendar day (`MM-DD`) and per year. */
export interface Normals {
  annual: number;
  byDay: Record<string, number>;
  /** Number of complete years averaged. */
  years: number;
}

/**
 * Normals from daily weather: the mean of the yearly sums over complete years, and the mean
 * per calendar day (§2, normal year).
 */
export function normals(
  weather: Array<{ day: string; t: number; fh: number }>,
  base: number,
  method: DegreeDayMethod,
): Normals {
  const perYear = new Map<number, { sum: number; days: number }>();
  const perDay = new Map<string, { sum: number; n: number }>();
  for (const w of weather) {
    const date = plain(w.day);
    const dd = degreeDays(w, date.month, base, method);
    const year = perYear.get(date.year) ?? { sum: 0, days: 0 };
    year.sum += dd;
    year.days++;
    perYear.set(date.year, year);
    const key = w.day.slice(5);
    const day = perDay.get(key) ?? { sum: 0, n: 0 };
    day.sum += dd;
    day.n++;
    perDay.set(key, day);
  }
  const complete = [...perYear.values()].filter((y) => y.days >= 360);
  const byDay = Object.fromEntries([...perDay].map(([key, v]) => [key, v.sum / v.n]));
  // Without complete years, the sum of the day means is the best estimate.
  const annual = complete.length
    ? complete.reduce((s, y) => s + y.sum, 0) / complete.length
    : Object.values(byDay).reduce((s, v) => s + v, 0);
  return { annual, byDay, years: complete.length };
}

const normalOn = (normals: Normals, date: PlainDate) => {
  const key = formatPlainDate(date).slice(5);
  return normals.byDay[key] ?? normals.byDay['02-28'] ?? 0;
};

export interface GasForecast {
  year: number;
  /** Measured so far this year. */
  actual: number;
  /** Estimated for missing past days and the rest of the year. */
  estimated: number;
  total: number;
}

/**
 * Expected consumption for the calendar year of `today` (§3.5): measured days, plus the
 * heating line for missing days (actual degree days when known, else normal), plus normal
 * weather for the remaining days.
 */
export function forecastYear(
  days: RatedDay[],
  today: string,
  baseline: number,
  line: HeatingLine | null,
  normals: Normals,
): GasForecast | null {
  if (!line) return null;
  const year = plain(today).year;
  const byDay = new Map(days.map((d) => [d.day, d]));
  let actual = 0;
  let estimated = 0;
  for (
    let date: PlainDate = { year, month: 1, day: 1 };
    date.year === year;
    date = addDays(date, 1)
  ) {
    const key = formatPlainDate(date);
    const d = byDay.get(key);
    if (d?.m3 !== null && d?.m3 !== undefined && key < today) actual += d.m3;
    else {
      const dd = key < today && d?.dd != null ? d.dd : normalOn(normals, date);
      estimated += baseline + Math.max(0, line.slope) * dd;
    }
  }
  return { year, actual, estimated, total: actual + estimated };
}

/** The fixed method behind every comparison (§4.1): weighted degree days, 18 °C. */
export const REFERENCE_BASE = 18;
export const REFERENCE_METHOD: DegreeDayMethod = 'weighted';
/**
 * Comparisons need this many measured days in the last year, and those days must hold at least
 * this share of a normal year's degree days (enough of a heating season) …
 */
export const REFERENCE_MIN_DAYS = 180;
export const REFERENCE_MIN_DD_SHARE = 0.3;
/** … and at least this much gas per year; below it the house is not heated with gas. */
export const REFERENCE_MIN_M3 = 50;

/**
 * Weather-corrected consumption of the last 365 days with the reference method, or null with
 * too little data or almost no gas. `days` must carry the reference station's weather.
 */
export function referenceAnnual(days: GasDay[], normalAnnual: number): number | null {
  const last = recent(days);
  const rated = rateDays(last, REFERENCE_BASE, REFERENCE_METHOD);
  const known = rated.filter((d) => d.m3 !== null && d.dd !== null);
  if (known.length < REFERENCE_MIN_DAYS) return null;
  const dd = known.reduce((s, d) => s + d.dd!, 0);
  if (dd < normalAnnual * REFERENCE_MIN_DD_SHARE) return null;
  const baseline = chooseBaseline({
    cooking: true,
    auto: autoBaseline(last, REFERENCE_BASE),
    line: heatingLine(rated),
  }).value;
  const annual = normalised(
    {
      days: known.length,
      m3: known.reduce((s, d) => s + d.m3!, 0),
      dd,
    },
    baseline,
    normalAnnual,
    RECENT_DAYS,
  );
  return annual !== null && annual >= REFERENCE_MIN_M3 ? annual : null;
}

/**
 * Degree days of the calendar year of `today` up to the last day with weather, and the normal
 * degree days of those same calendar days; null without weather this year.
 */
export function degreeDaysToDate(
  days: RatedDay[],
  today: string,
  normals: Normals,
): { year: number; actual: number; normal: number } | null {
  const year = plain(today).year;
  const inYear = days.filter((d) => d.dd !== null && plain(d.day).year === year && d.day < today);
  if (inYear.length === 0) return null;
  return {
    year,
    actual: inYear.reduce((s, d) => s + d.dd!, 0),
    normal: inYear.reduce((s, d) => s + normalOn(normals, plain(d.day)), 0),
  };
}

/** At least this share of a 365-day window must be measured for a rolling value. */
const MIN_ROLLING_DAYS = 180;

/**
 * Weather-corrected consumption of the 365 days ending `offset` days before the last day, or
 * null when fewer than 180 of those days have both gas and weather.
 */
export function rollingCorrected(
  days: RatedDay[],
  baseline: number,
  normalAnnual: number,
  offset = 0,
): { corrected: number; days: number } | null {
  const end = days.length - offset;
  if (end <= 0) return null;
  const window = days
    .slice(Math.max(0, end - RECENT_DAYS), end)
    .filter((d) => d.m3 !== null && d.dd !== null);
  if (window.length < MIN_ROLLING_DAYS) return null;
  const corrected = normalised(
    {
      days: window.length,
      m3: window.reduce((s, d) => s + d.m3!, 0),
      dd: window.reduce((s, d) => s + d.dd!, 0),
    },
    baseline,
    normalAnnual,
    RECENT_DAYS,
  );
  return corrected === null ? null : { corrected, days: window.length };
}
