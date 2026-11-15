import { normals, type DegreeDayMethod, type Normals } from '@p1/shared';
import { HOURLY_FROM_YEAR, NORMAL_YEARS } from '../opendata/job';
import type { DailyWeather, OpenDataStore } from '../opendata/store';

const CACHE_MS = 60 * 60_000;

/**
 * Daily weather per station since 2023 (from hourly data, local days) and the normal year
 * (from KNMI daily data), read from the `open-data` bucket and kept in memory for an hour.
 */
export class WeatherService {
  private readonly days = new Map<number, { at: number; days: Map<string, DailyWeather> }>();
  private readonly normalDays = new Map<number, { at: number; list: DailyWeather[] }>();
  private readonly normalCache = new Map<string, { at: number; normals: Normals }>();

  constructor(
    private readonly store: OpenDataStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async daily(station: number): Promise<Map<string, DailyWeather>> {
    const cached = this.days.get(station);
    if (cached && this.now().getTime() - cached.at < CACHE_MS) return cached.days;
    const list = await this.store.dailyWeather(
      station,
      new Date(Date.UTC(HOURLY_FROM_YEAR, 0, 1)),
      this.now(),
    );
    const days = new Map(list.map((d) => [d.day, d]));
    this.days.set(station, { at: this.now().getTime(), days });
    return days;
  }

  /** Normal degree days over the 20 complete years before the current year (KNMI daily data). */
  async normals(station: number, base: number, method: DegreeDayMethod): Promise<Normals> {
    const year = this.now().getUTCFullYear();
    let days = this.normalDays.get(station);
    if (!days || this.now().getTime() - days.at >= CACHE_MS) {
      const list = await this.store.normalDays(station, year - NORMAL_YEARS, year - 1);
      days = { at: this.now().getTime(), list };
      this.normalDays.set(station, days);
    }
    const key = `${station}|${base}|${method}`;
    const cached = this.normalCache.get(key);
    if (cached && cached.at === days.at) return cached.normals;
    const result = normals(days.list, base, method);
    this.normalCache.set(key, { at: days.at, normals: result });
    return result;
  }

  /** Drops the cache of a station, e.g. after its weather was (back)filled. */
  invalidate(station: number): void {
    this.days.delete(station);
    this.normalDays.delete(station);
  }
}
