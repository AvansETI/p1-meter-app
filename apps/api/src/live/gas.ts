import type { GasHour } from '@p1/shared';

export const HOUR_MS = 3_600_000;

/** Start of the current whole hour. Europe/Amsterdam is a whole number of hours from UTC. */
export function hourStart(now: number): number {
  return Math.floor(now / HOUR_MS) * HOUR_MS;
}

/**
 * Hourly gas use from the counter value at the end of each hour (architecture §7.4 for gaps).
 * `lastPerHour` maps the start of an hour (ms) to the last counter value in that hour; it should
 * include the hour before the first displayed one as baseline.
 */
export function hourlyGas(lastPerHour: Map<number, number>, now: number, hours = 24): GasHour[] {
  const current = hourStart(now);
  const first = current - (hours - 1) * HOUR_MS;

  // Most recent known counter value before the first displayed hour.
  let known: { hour: number; value: number } | undefined;
  for (const [hour, value] of lastPerHour) {
    if (hour < first && (!known || hour > known.hour)) known = { hour, value };
  }

  const result: GasHour[] = [];
  for (let hour = first; hour <= current; hour += HOUR_MS) {
    const value = lastPerHour.get(hour);
    const start = new Date(hour).toISOString();
    if (value === undefined) {
      result.push({ start, m3: null });
      continue;
    }
    if (!known) {
      result.push({ start, m3: null }); // no baseline to subtract from
    } else {
      const delta = value - known.value;
      const gapStart = known.hour + HOUR_MS;
      if (delta < 0)
        result.push({ start, m3: null }); // counter replaced or reset
      else if (gapStart < hour) {
        result.push({
          start,
          m3: round(delta),
          spansGap: true,
          gapStart: new Date(gapStart).toISOString(),
        });
      } else result.push({ start, m3: round(delta) });
    }
    known = { hour, value };
  }
  return result;
}

/**
 * Meters that report gas once per hour (DSMR ≤ 4) raise the counter just after the full hour.
 * Considered hourly when ≥ 3 increases and ≥ 80 % of them fall in the first 10 minutes.
 */
export function detectHourlyUpdates(increaseTimes: number[]): boolean {
  if (increaseTimes.length < 3) return false;
  const early = increaseTimes.filter((t) => new Date(t).getUTCMinutes() < 10).length;
  return early / increaseTimes.length >= 0.8;
}

const round = (value: number) => Math.round(value * 1000) / 1000;
