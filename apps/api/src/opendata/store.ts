import { InfluxDB, Point, type QueryApi, type WriteApi } from '@influxdata/influxdb-client';
import type { CbsFigures } from '@p1/shared';
import { UpstreamError } from '../data/source';
import { dayKey } from '../usage/tracker';
import type { CbsRow } from './cbs';
import type { WeatherHour } from './knmi';

/** Mean weather of one local day (YYYY-MM-DD). */
export interface DailyWeather {
  day: string;
  t: number;
  fh: number;
}

/**
 * Cache of public data in the `open-data` bucket (docs/design/2026-11-15-gas-analysis.md §6.1):
 * KNMI hourly weather and CBS gas figures. An in-memory variant serves tests and setups
 * without the bucket.
 */
export interface OpenDataStore {
  writeWeather(station: number, hours: WeatherHour[]): Promise<void>;
  /** Number of stored hours per UTC year. */
  weatherHoursPerYear(station: number): Promise<Map<number, number>>;
  /** End of the latest stored hour, or null. */
  lastWeatherHour(station: number): Promise<Date | null>;
  /** Daily means of the local days in [from, to) with at least 20 hours of temperature. */
  dailyWeather(station: number, from: Date, to: Date): Promise<DailyWeather[]>;
  /** Hour start (ms) → temperature for the hours starting in [from, to). */
  hourlyTemperature(station: number, from: Date, to: Date): Promise<Map<number, number>>;
  writeCbs(rows: CbsRow[]): Promise<void>;
  cbsYears(): Promise<number[]>;
  cbsRows(): Promise<CbsRow[]>;
  close(): Promise<void>;
}

const HOUR_MS = 3_600_000;
/** A day needs this many hourly temperatures to count. */
const MIN_HOURS_PER_DAY = 20;
const WEATHER = 'knmi_hourly';
const CBS = 'cbs_gas';
const WRITE_CHUNK = 750;
const FIGURES = ['mean', 'p10', 'p20', 'p30', 'p40', 'p50', 'p60', 'p70', 'p80', 'p90'] as const;

const cbsTime = (year: number) => new Date(Date.UTC(year, 0, 1));

function figuresFrom(row: Record<string, unknown>, suffix: string): CbsFigures | null {
  const values = FIGURES.map((f) => row[f + suffix]);
  if (values.some((v) => typeof v !== 'number')) return null;
  return Object.fromEntries(FIGURES.map((f, i) => [f, values[i]])) as unknown as CbsFigures;
}

export class InfluxOpenDataStore implements OpenDataStore {
  private readonly writeApi: WriteApi;
  private readonly queryApi: QueryApi;

  constructor(
    private readonly options: { url: string; org: string; bucket: string; token: string },
  ) {
    const client = new InfluxDB({ url: options.url, token: options.token, timeout: 60_000 });
    this.writeApi = client.getWriteApi(options.org, options.bucket, 's');
    this.queryApi = client.getQueryApi(options.org);
  }

  private async query(flux: string): Promise<Array<Record<string, unknown>>> {
    try {
      return await this.queryApi.collectRows<Record<string, unknown>>(flux);
    } catch (error) {
      throw new UpstreamError(
        `open-data query failed: ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`,
      );
    }
  }

  private weather(station: number, from: string, to = 'now()') {
    return `from(bucket: ${JSON.stringify(this.options.bucket)})
  |> range(start: ${from}, stop: ${to})
  |> filter(fn: (r) => r._measurement == "${WEATHER}" and r.station == "${station}")`;
  }

  async writeWeather(station: number, hours: WeatherHour[]): Promise<void> {
    const points = hours.flatMap((h) => {
      if (h.t === null && h.fh === null) return [];
      const point = new Point(WEATHER).tag('station', String(station)).timestamp(h.time);
      if (h.t !== null) point.floatField('t', h.t);
      if (h.fh !== null) point.floatField('fh', h.fh);
      return [point];
    });
    // About a month per write, small enough to finish while InfluxDB is busy.
    for (let i = 0; i < points.length; i += WRITE_CHUNK) {
      this.writeApi.writePoints(points.slice(i, i + WRITE_CHUNK));
      await this.writeApi.flush();
    }
  }

  async weatherHoursPerYear(station: number): Promise<Map<number, number>> {
    const rows = await this.query(`${this.weather(station, '2000-01-01T00:00:00Z')}
  |> filter(fn: (r) => r._field == "t")
  |> aggregateWindow(every: 1y, fn: count, createEmpty: false, timeSrc: "_start")`);
    const result = new Map<number, number>();
    for (const row of rows) {
      if (typeof row._time === 'string' && typeof row._value === 'number') {
        result.set(new Date(row._time).getUTCFullYear(), row._value);
      }
    }
    return result;
  }

  async lastWeatherHour(station: number): Promise<Date | null> {
    const rows = await this.query(`${this.weather(station, '2000-01-01T00:00:00Z')}
  |> filter(fn: (r) => r._field == "t")
  |> last()`);
    const time = rows[0]?._time;
    return typeof time === 'string' ? new Date(time) : null;
  }

  async dailyWeather(station: number, from: Date, to: Date): Promise<DailyWeather[]> {
    // Timestamps are hour ends: shift half an hour back so each hour lands in its own day.
    const rows = await this.query(`import "timezone"
option location = timezone.location(name: "Europe/Amsterdam")
data = ${this.weather(station, from.toISOString(), to.toISOString())}
  |> timeShift(duration: -30m)
data
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false, timeSrc: "_start")
  |> yield(name: "mean")
data
  |> filter(fn: (r) => r._field == "t")
  |> aggregateWindow(every: 1d, fn: count, createEmpty: false, timeSrc: "_start")
  |> yield(name: "count")`);
    const days = new Map<string, { t?: number; fh?: number; n: number }>();
    for (const row of rows) {
      if (typeof row._time !== 'string' || typeof row._value !== 'number') continue;
      const key = dayKey(new Date(row._time));
      const day = days.get(key) ?? { n: 0 };
      if (row.result === 'count') day.n = row._value;
      else if (row._field === 't') day.t = row._value;
      else if (row._field === 'fh') day.fh = row._value;
      days.set(key, day);
    }
    return [...days]
      .filter(([, d]) => d.t !== undefined && d.n >= MIN_HOURS_PER_DAY)
      .map(([day, d]) => ({ day, t: d.t!, fh: d.fh ?? 0 }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }

  async hourlyTemperature(station: number, from: Date, to: Date): Promise<Map<number, number>> {
    const rows = await this.query(`${this.weather(
      station,
      new Date(from.getTime() + HOUR_MS).toISOString(),
      new Date(to.getTime() + HOUR_MS).toISOString(),
    )}
  |> filter(fn: (r) => r._field == "t")
  |> keep(columns: ["_time", "_value"])`);
    const result = new Map<number, number>();
    for (const row of rows) {
      if (typeof row._time === 'string' && typeof row._value === 'number') {
        result.set(Date.parse(row._time) - HOUR_MS, row._value);
      }
    }
    return result;
  }

  async writeCbs(rows: CbsRow[]): Promise<void> {
    const points = rows.map((row) => {
      const point = new Point(CBS)
        .tag('type', row.type)
        .tag('area', row.area)
        .tag('period', row.period)
        .tag('residents', row.residents)
        .tag('heating', row.heating)
        .timestamp(cbsTime(row.year));
      for (const f of FIGURES) {
        point.floatField(f, row.perDwelling[f]);
        if (row.perM2) point.floatField(`${f}_m2`, row.perM2[f]);
      }
      return point;
    });
    for (let i = 0; i < points.length; i += WRITE_CHUNK) {
      this.writeApi.writePoints(points.slice(i, i + WRITE_CHUNK));
      await this.writeApi.flush();
    }
  }

  async cbsYears(): Promise<number[]> {
    const rows = await this.query(`from(bucket: ${JSON.stringify(this.options.bucket)})
  |> range(start: 2000-01-01T00:00:00Z)
  |> filter(fn: (r) => r._measurement == "${CBS}" and r._field == "mean")
  |> group()
  |> aggregateWindow(every: 1y, fn: count, createEmpty: false, timeSrc: "_start")`);
    return rows.flatMap((row) =>
      typeof row._time === 'string' ? [new Date(row._time).getUTCFullYear()] : [],
    );
  }

  async cbsRows(): Promise<CbsRow[]> {
    const rows = await this.query(`from(bucket: ${JSON.stringify(this.options.bucket)})
  |> range(start: 2000-01-01T00:00:00Z)
  |> filter(fn: (r) => r._measurement == "${CBS}")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`);
    return rows.flatMap((row) => {
      const perDwelling = figuresFrom(row, '');
      if (!perDwelling || typeof row._time !== 'string') return [];
      return [
        {
          year: new Date(row._time).getUTCFullYear(),
          type: String(row.type),
          area: String(row.area),
          period: String(row.period),
          residents: String(row.residents),
          heating: String(row.heating),
          perDwelling,
          perM2: figuresFrom(row, '_m2'),
        },
      ];
    });
  }

  async close(): Promise<void> {
    await this.writeApi.close();
  }
}

/** In-memory store for tests and setups without the `open-data` bucket. */
export class MemoryOpenDataStore implements OpenDataStore {
  readonly weather = new Map<number, Map<number, { t: number | null; fh: number | null }>>();
  cbs: CbsRow[] = [];

  private hours(station: number) {
    let hours = this.weather.get(station);
    if (!hours) {
      hours = new Map<number, { t: number | null; fh: number | null }>();
      this.weather.set(station, hours);
    }
    return hours;
  }

  private run<T>(fn: () => T): Promise<T> {
    return Promise.resolve(fn());
  }

  writeWeather(station: number, hours: WeatherHour[]): Promise<void> {
    return this.run(() => {
      for (const h of hours) this.hours(station).set(h.time.getTime(), { t: h.t, fh: h.fh });
    });
  }

  weatherHoursPerYear(station: number): Promise<Map<number, number>> {
    return this.run(() => {
      const result = new Map<number, number>();
      for (const [time, h] of this.hours(station)) {
        if (h.t === null) continue;
        const year = new Date(time).getUTCFullYear();
        result.set(year, (result.get(year) ?? 0) + 1);
      }
      return result;
    });
  }

  lastWeatherHour(station: number): Promise<Date | null> {
    return this.run(() => {
      let last = -Infinity;
      for (const time of this.hours(station).keys()) last = Math.max(last, time);
      return Number.isFinite(last) ? new Date(last) : null;
    });
  }

  dailyWeather(station: number, from: Date, to: Date): Promise<DailyWeather[]> {
    return this.run(() => {
      const days = new Map<string, { t: number; fh: number; n: number }>();
      for (const [end, h] of this.hours(station)) {
        const mid = end - HOUR_MS / 2;
        if (h.t === null || mid < from.getTime() || mid >= to.getTime()) continue;
        const key = dayKey(new Date(mid));
        const day = days.get(key) ?? { t: 0, fh: 0, n: 0 };
        day.t += h.t;
        day.fh += h.fh ?? 0;
        day.n++;
        days.set(key, day);
      }
      return [...days]
        .filter(([, d]) => d.n >= MIN_HOURS_PER_DAY)
        .map(([day, d]) => ({ day, t: d.t / d.n, fh: d.fh / d.n }))
        .sort((a, b) => (a.day < b.day ? -1 : 1));
    });
  }

  hourlyTemperature(station: number, from: Date, to: Date): Promise<Map<number, number>> {
    return this.run(() => {
      const result = new Map<number, number>();
      for (const [end, h] of this.hours(station)) {
        const start = end - HOUR_MS;
        if (h.t !== null && start >= from.getTime() && start < to.getTime()) {
          result.set(start, h.t);
        }
      }
      return result;
    });
  }

  writeCbs(rows: CbsRow[]): Promise<void> {
    return this.run(() => {
      const key = (r: CbsRow) =>
        [r.year, r.type, r.area, r.period, r.residents, r.heating].join('|');
      const incoming = new Set(rows.map(key));
      this.cbs = [...this.cbs.filter((r) => !incoming.has(key(r))), ...rows];
    });
  }

  cbsYears(): Promise<number[]> {
    return this.run(() => [...new Set(this.cbs.map((r) => r.year))].sort());
  }

  cbsRows(): Promise<CbsRow[]> {
    return this.run(() => this.cbs);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
