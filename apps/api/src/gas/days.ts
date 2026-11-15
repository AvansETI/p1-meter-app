import { addDays, formatPlainDate, parsePlainDate, type GasDay } from '@p1/shared';
import type { GasDayEnd } from '../data/source';
import type { DailyWeather } from '../opendata/store';

const HOUR_MS = 3_600_000;
/** More than this per day is a counter glitch, not use. */
const MAX_M3_PER_DAY = 100;

const nextDay = (day: string) => formatPlainDate(addDays(parsePlainDate(day)!, 1));

/**
 * Gas per local day from the last reading of each day (design §3): the difference with the
 * previous day, only when both readings lie within an hour of their midnight. Days around a
 * gap are left out rather than spread out.
 */
export function dailyGas(ends: GasDayEnd[]): Map<string, number> {
  const result = new Map<string, number>();
  for (let i = 1; i < ends.length; i++) {
    const prev = ends[i - 1]!;
    const cur = ends[i]!;
    if (nextDay(prev.day) !== cur.day) continue;
    if (prev.dayEnd - prev.time > HOUR_MS || cur.dayEnd - cur.time > HOUR_MS) continue;
    const m3 = cur.value - prev.value;
    if (m3 >= 0 && m3 <= MAX_M3_PER_DAY) result.set(cur.day, Math.round(m3 * 1000) / 1000);
  }
  return result;
}

/** Every day in [first, last] with its gas and weather (null when unknown). */
export function mergeDays(
  gas: Map<string, number>,
  weather: Map<string, DailyWeather>,
  first: string,
  last: string,
): GasDay[] {
  const days: GasDay[] = [];
  for (let day = first; day <= last; day = nextDay(day)) {
    const w = weather.get(day);
    days.push({ day, m3: gas.get(day) ?? null, t: w?.t ?? null, fh: w?.fh ?? null });
  }
  return days;
}
