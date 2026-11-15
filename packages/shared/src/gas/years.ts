/**
 * Year division of the gas analysis (docs/design/2026-11-15-gas-analysis.md §11.1): calendar
 * years, contract years from the contract start, or heating seasons from 1 July.
 */
import { z } from 'zod';
import { formatPlainDate, parsePlainDate } from '../calendar';

export const YEAR_DIVISIONS = ['calendar', 'contract', 'heating'] as const;
export const YearDivisionSchema = z.enum(YEAR_DIVISIONS);
export type YearDivision = z.infer<typeof YearDivisionSchema>;

/** First day of every year, as month and day. */
export interface YearStart {
  month: number;
  day: number;
}

export const CALENDAR_START: YearStart = { month: 1, day: 1 };
export const HEATING_START: YearStart = { month: 7, day: 1 };

/** "MM-DD", as sent by the web app. */
export const MonthDaySchema = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

/** A start from "MM-DD" or a date "YYYY-MM-DD"; 29 February becomes 28 February. */
export function parseYearStart(value: string): YearStart | null {
  const monthDay = value.length === 10 ? value.slice(5) : value;
  if (monthDay === '02-29') return { month: 2, day: 28 };
  // A non-leap year checks the day exists in that month.
  const date = parsePlainDate(`2001-${monthDay}`);
  return date ? { month: date.month, day: date.day } : null;
}

export const formatYearStart = ({ month, day }: YearStart) =>
  `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const isCalendar = (start: YearStart) => start.month === 1 && start.day === 1;

/** First day (YYYY-MM-DD) of the year that starts in `startYear`. */
export function yearFirstDay(startYear: number, start: YearStart): string {
  return formatPlainDate({ year: startYear, month: start.month, day: start.day });
}

/** The year (by the calendar year it starts in) that contains `day`. */
export function yearOf(day: string, start: YearStart): number {
  const year = Number(day.slice(0, 4));
  return day >= yearFirstDay(year, start) ? year : year - 1;
}

/** "2026" for calendar years, "2026-2027" otherwise. */
export function yearLabel(startYear: number, start: YearStart): string {
  return isCalendar(start) ? String(startYear) : `${startYear}-${startYear + 1}`;
}

/** Number of days in the year that starts in `startYear`. */
export function yearLength(startYear: number, start: YearStart): number {
  const first = Date.parse(yearFirstDay(startYear, start));
  const next = Date.parse(yearFirstDay(startYear + 1, start));
  return Math.round((next - first) / 86_400_000);
}
