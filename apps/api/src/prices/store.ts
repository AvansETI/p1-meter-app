import { InfluxDB, Point, type QueryApi, type WriteApi } from '@influxdata/influxdb-client';
import { UpstreamError } from '../data/source';
import type { PricePoint } from './entsoe';
import type { GasPricePoint } from './energyzero';

export type PriceKind = 'electricity' | 'gas';

const MEASUREMENT: Record<PriceKind, string> = {
  electricity: 'electricity_day_ahead',
  gas: 'gas_day_ahead',
};

/** Writes and inspects prices in the separate price bucket (docs/design/2026-11-09-costs.md §4.2). */
export interface PriceStore {
  writeElectricity(points: PricePoint[]): Promise<void>;
  writeGas(points: GasPricePoint[]): Promise<void>;
  /** Number of price points per local day (key: day start ms) in [from, to). */
  pointsPerDay(kind: PriceKind, from: Date, to: Date): Promise<Map<number, number>>;
}

/** Reads prices for the cost engine (docs/design/2026-11-09-costs.md §6.2). */
export interface PriceReader {
  /** Quarter start (ms) → EUR/kWh excl. VAT in [from, to); hourly prices fill four quarters. */
  electricityPrices(from: Date, to: Date): Promise<Map<number, number>>;
  /** Hour start (ms) → EUR/m³ excl. VAT and energy tax in [from, to). */
  gasPrices(from: Date, to: Date): Promise<Map<number, number>>;
}

const QUARTER_MS = 15 * 60_000;

export class InfluxPriceStore implements PriceStore, PriceReader {
  private readonly writeApi: WriteApi;
  private readonly queryApi: QueryApi;

  constructor(
    private readonly options: { url: string; org: string; bucket: string; token: string },
  ) {
    const client = new InfluxDB({ url: options.url, token: options.token, timeout: 30_000 });
    this.writeApi = client.getWriteApi(options.org, options.bucket, 's');
    this.queryApi = client.getQueryApi(options.org);
  }

  async writeElectricity(points: PricePoint[]): Promise<void> {
    this.writeApi.writePoints(
      points.map((p) =>
        new Point(MEASUREMENT.electricity)
          .tag('area', 'NL')
          .tag('resolution', p.resolution)
          .floatField('eur_per_kwh', p.eurPerKwh)
          .timestamp(p.time),
      ),
    );
    await this.writeApi.flush();
  }

  async writeGas(points: GasPricePoint[]): Promise<void> {
    this.writeApi.writePoints(
      points.map((p) =>
        new Point(MEASUREMENT.gas)
          .tag('area', 'NL')
          .tag('source', 'energyzero')
          .floatField('eur_per_m3', p.eurPerM3)
          .timestamp(p.time),
      ),
    );
    await this.writeApi.flush();
  }

  async pointsPerDay(kind: PriceKind, from: Date, to: Date): Promise<Map<number, number>> {
    const rows = await this.queryApi.collectRows<Record<string, unknown>>(`
import "timezone"
option location = timezone.location(name: "Europe/Amsterdam")
from(bucket: ${JSON.stringify(this.options.bucket)})
  |> range(start: ${from.toISOString()}, stop: ${to.toISOString()})
  |> filter(fn: (r) => r._measurement == ${JSON.stringify(MEASUREMENT[kind])})
  |> group()
  |> aggregateWindow(every: 1d, fn: count, createEmpty: false, timeSrc: "_start")`);
    const result = new Map<number, number>();
    for (const row of rows) {
      if (typeof row._time === 'string' && typeof row._value === 'number') {
        result.set(Date.parse(row._time), row._value);
      }
    }
    return result;
  }

  async electricityPrices(from: Date, to: Date): Promise<Map<number, number>> {
    const result = new Map<number, number>();
    for (const row of await this.read('electricity', from, to)) {
      const time = Date.parse(String(row._time));
      const quarters = row.resolution === 'PT60M' ? 4 : 1;
      for (let i = 0; i < quarters; i++) {
        const start = time + i * QUARTER_MS;
        if (start < to.getTime()) result.set(start, Number(row._value));
      }
    }
    return result;
  }

  async gasPrices(from: Date, to: Date): Promise<Map<number, number>> {
    const rows = await this.read('gas', from, to);
    return new Map(rows.map((row) => [Date.parse(String(row._time)), Number(row._value)]));
  }

  private async read(kind: PriceKind, from: Date, to: Date) {
    try {
      return await this.queryApi.collectRows<Record<string, unknown>>(`
from(bucket: ${JSON.stringify(this.options.bucket)})
  |> range(start: ${from.toISOString()}, stop: ${to.toISOString()})
  |> filter(fn: (r) => r._measurement == ${JSON.stringify(MEASUREMENT[kind])})
  |> keep(columns: ["_time", "_value", "resolution"])`);
    } catch (error) {
      throw new UpstreamError(
        `price query failed: ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`,
      );
    }
  }

  async close(): Promise<void> {
    await this.writeApi.close();
  }
}
