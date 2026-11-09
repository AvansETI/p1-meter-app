/**
 * Calendar arithmetic on plain dates (YYYY-MM-DD), independent of time zones. Used by the API
 * to find period boundaries and by the web app for navigation.
 */
export const PERIODS = ['day', 'week', 'month', 'year'] as const;
export type Period = (typeof PERIODS)[number];

export interface PlainDate {
  year: number;
  month: number; // 1–12
  day: number;
}

export function parsePlainDate(value: string): PlainDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function formatPlainDate({ year, month, day }: PlainDate): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Normalises overflowing values (e.g. day 0, month 13) via the UTC calendar. */
function plain(year: number, month: number, day: number): PlainDate {
  const date = new Date(Date.UTC(year, month - 1, day));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** 0 = Monday … 6 = Sunday. */
export function weekday({ year, month, day }: PlainDate): number {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return plain(date.year, date.month, date.day + days);
}

/** First day of the period that contains `date` (weeks start on Monday). */
export function periodStart(date: PlainDate, period: Period): PlainDate {
  switch (period) {
    case 'day':
      return date;
    case 'week':
      return addDays(date, -weekday(date));
    case 'month':
      return { ...date, day: 1 };
    case 'year':
      return { year: date.year, month: 1, day: 1 };
  }
}

/** Start of the period `steps` periods after the one containing `date`. */
export function shiftPeriod(date: PlainDate, period: Period, steps: number): PlainDate {
  const start = periodStart(date, period);
  switch (period) {
    case 'day':
      return addDays(start, steps);
    case 'week':
      return addDays(start, steps * 7);
    case 'month':
      return plain(start.year, start.month + steps, 1);
    case 'year':
      return { year: start.year + steps, month: 1, day: 1 };
  }
}

/** The plain days of a period, or the first day of each month for a year. */
export function bucketDates(date: PlainDate, period: Exclude<Period, 'day'>): PlainDate[] {
  const start = periodStart(date, period);
  const end = shiftPeriod(start, period, 1);
  const result: PlainDate[] = [];
  if (period === 'year') {
    for (let month = 1; month <= 12; month++) result.push({ year: start.year, month, day: 1 });
    return result;
  }
  for (let d = start; formatPlainDate(d) < formatPlainDate(end); d = addDays(d, 1)) result.push(d);
  return result;
}

/** ISO 8601 week number. */
export function isoWeek(date: PlainDate): { year: number; week: number } {
  const thursday = addDays(date, 3 - weekday(date));
  const jan4 = { year: thursday.year, month: 1, day: 4 };
  const week1Monday = addDays(jan4, -weekday(jan4));
  const days =
    (Date.UTC(thursday.year, thursday.month - 1, thursday.day) -
      Date.UTC(week1Monday.year, week1Monday.month - 1, week1Monday.day)) /
    86_400_000;
  return { year: thursday.year, week: Math.floor(days / 7) + 1 };
}
