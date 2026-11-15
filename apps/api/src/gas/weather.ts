import { normals, type DegreeDayMethod, type Normals } from '@p1/shared';
import { NORMAL_YEARS } from '../opendata/job';
import type { DailyWeather, OpenDataStore } from '../opendata/store';

const CACHE_MS = 60 * 60_000;

/**
 * Daily weather per station over the normal period plus the current year, read from the
 * `open-data` bucket and kept in memory for an hour (design §6.1).
 */
export class WeatherService {
  private readonly days = new Map<number, { at: number; days: Map<string, DailyWeather> }>();
  private readonly normalCache = new Map<string, { at: number; normals: Normals }>();

  constructor(
    private readonly store: OpenDataStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async daily(station: number): Promise<Map<string, DailyWeather>> {
    const cached = this.days.get(station);
    if (cached && this.now().getTime() - cached.at < CACHE_MS) return cached.days;
    const year = this.now().getUTCFullYear();
    const list = await this.store.dailyWeather(
      station,
      new Date(Date.UTC(year - NORMAL_YEARS, 0, 1)),
      this.now(),
    );
    const days = new Map(list.map((d) => [d.day, d]));
    this.days.set(station, { at: this.now().getTime(), days });
    return days;
  }

  /** Normal degree days over the 20 complete years before the current year. */
  async normals(station: number, base: number, method: DegreeDayMethod): Promise<Normals> {
    const daily = await this.daily(station);
    const stamp = this.days.get(station)!.at;
    const key = `${station}|${base}|${method}`;
    const cached = this.normalCache.get(key);
    if (cached && cached.at === stamp) return cached.normals;
    const firstYear = String(this.now().getUTCFullYear() - NORMAL_YEARS);
    const thisYear = String(this.now().getUTCFullYear());
    const inPeriod = [...daily.values()].filter(
      (d) => d.day.slice(0, 4) >= firstYear && d.day.slice(0, 4) < thisYear,
    );
    const result = normals(inPeriod, base, method);
    this.normalCache.set(key, { at: stamp, normals: result });
    return result;
  }

  /** Drops the cache of a station, e.g. after its weather was (back)filled. */
  invalidate(station: number): void {
    this.days.delete(station);
  }
}
