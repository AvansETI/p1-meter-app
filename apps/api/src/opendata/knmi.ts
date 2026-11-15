/** KNMI hourly station data (docs/design/2026-11-15-gas-analysis.md §6.1). */

export const KNMI_HOURLY_URL = 'https://www.daggegevens.knmi.nl/klimatologie/uurgegevens';

export interface WeatherHour {
  /** End of the KNMI hour (UTC). */
  time: Date;
  /** °C. */
  t: number | null;
  /** m/s. */
  fh: number | null;
}

const HOUR_MS = 3_600_000;

/** UT calendar date of an instant as YYYYMMDD. */
const knmiDate = (instant: Date) => instant.toISOString().slice(0, 10).replaceAll('-', '');

/**
 * Form body for the hours ending in (from, to], both whole UTC hours. KNMI reads start and
 * end as a date range plus an hour window applied to every day, so the request always asks
 * for hours 1–24 of each day; a little more may come back, and rewriting an hour is harmless.
 */
export function knmiHourlyBody(station: number, from: Date, to: Date): URLSearchParams {
  return new URLSearchParams({
    stns: String(station),
    vars: 'T:FH',
    start: `${knmiDate(from)}01`,
    end: `${knmiDate(new Date(to.getTime() - HOUR_MS))}24`,
    fmt: 'json',
  });
}

const tenth = (value: unknown) => (typeof value === 'number' ? value / 10 : null);

/** Parses the JSON answer: temperature and wind are given in tenths. */
export function parseKnmiHourly(json: unknown): WeatherHour[] {
  if (!Array.isArray(json)) throw new Error('unexpected KNMI response');
  const hours: WeatherHour[] = [];
  for (const row of json as Array<Record<string, unknown>>) {
    if (typeof row.date !== 'string' || typeof row.hour !== 'number') continue;
    const time = new Date(Date.parse(row.date) + row.hour * HOUR_MS);
    hours.push({ time, t: tenth(row.T), fh: tenth(row.FH) });
  }
  return hours;
}
