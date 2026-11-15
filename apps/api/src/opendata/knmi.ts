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

/** KNMI hour notation: hour 1 is 00:00–01:00 UT, so a UT instant ends hour `getUTCHours() || 24`. */
function knmiHour(end: Date): string {
  const shifted = new Date(end.getTime() - HOUR_MS);
  const date = shifted.toISOString().slice(0, 10).replaceAll('-', '');
  return `${date}${String(shifted.getUTCHours() + 1).padStart(2, '0')}`;
}

/**
 * Form body for the hours ending in (from, to], both whole UTC hours. KNMI answers whole
 * days, so a little more may come back; rewriting a stored hour is harmless.
 */
export function knmiHourlyBody(station: number, from: Date, to: Date): URLSearchParams {
  return new URLSearchParams({
    stns: String(station),
    vars: 'T:FH',
    start: knmiHour(new Date(from.getTime() + HOUR_MS)),
    end: knmiHour(to),
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
