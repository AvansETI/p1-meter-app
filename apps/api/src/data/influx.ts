import { InfluxDB, type QueryApi } from '@influxdata/influxdb-client';
import { DEFAULT_PROFILE, SIGNATURE_PATTERN, type Capabilities } from '@p1/shared';
import { decideOrientation, type DayStats } from './orientation';
import { UpstreamError, type HouseholdDataSource } from './source';

export interface InfluxOptions {
  url: string;
  org: string;
  bucket: string;
  token: string;
  timeoutMs: number;
}

const DETECTION_WINDOW = '-30d';

/** Flux string literal; JSON escaping is a valid subset of Flux string escaping. */
const literal = (value: string) => JSON.stringify(value);

export class InfluxDataSource implements HouseholdDataSource {
  private readonly queryApi: QueryApi;

  constructor(private readonly options: InfluxOptions) {
    this.queryApi = new InfluxDB({
      url: options.url,
      token: options.token,
      timeout: options.timeoutMs,
    }).getQueryApi(options.org);
  }

  async detect(signature: string): Promise<Capabilities | null> {
    if (!SIGNATURE_PATTERN.test(signature)) throw new Error('signature must be normalized');

    const rows = await this.query(this.detectionFlux(signature));
    const summary = rows.filter((row) => row.result === 'summary');
    const lastSeen = summary.find((row) => row.key === 'last')?._time;
    if (typeof lastSeen !== 'string') return null;

    const max = (field: string) => {
      const value = summary.find((row) => row.key === field)?._value;
      return typeof value === 'number' ? value : 0;
    };

    // Daily rows are keyed by window end time; assemble one DayStats per day.
    const days = new Map<string, DayStats>();
    const day = (time: string) => {
      let stats = days.get(time);
      if (!stats) {
        stats = { points: 0, importKwh: null, deltaConsumed: null, deltaProduced: null };
        days.set(time, stats);
      }
      return stats;
    };
    for (const row of rows) {
      if (typeof row._time !== 'string' || typeof row._value !== 'number') continue;
      if (row.result === 'count') day(row._time).points = row._value;
      if (row.result === 'integral') day(row._time).importKwh = row._value;
      if (row.result === 'spread' && row._field === 'energy_consumed') {
        day(row._time).deltaConsumed = row._value;
      }
      if (row.result === 'spread' && row._field === 'energy_produced') {
        day(row._time).deltaProduced = row._value;
      }
    }

    return {
      hasGas: max('gas_delivered') > 0,
      hasExport: max('power_produced') > 0,
      lastSeen,
      ...decideOrientation([...days.values()]),
    };
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(new URL('/ping', this.options.url), {
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private detectionFlux(signature: string): string {
    const { bucket } = this.options;
    const { measurement } = DEFAULT_PROFILE;
    return `
import "timezone"
option location = timezone.location(name: "Europe/Amsterdam")

data = from(bucket: ${literal(bucket)})
  |> range(start: ${DETECTION_WINDOW})
  |> filter(fn: (r) => r._measurement == ${literal(measurement)} and r.signature == ${literal(signature)})
power = data |> filter(fn: (r) => r._field == "power_consumed")

last = power |> last() |> group() |> map(fn: (r) => ({_time: r._time, _value: r._value, key: "last"}))
maxes = data
  |> filter(fn: (r) => r._field == "gas_delivered" or r._field == "power_produced")
  |> max()
  |> group()
  |> map(fn: (r) => ({_time: r._time, _value: r._value, key: r._field}))
union(tables: [last, maxes]) |> yield(name: "summary")

power |> aggregateWindow(every: 1d, fn: count, createEmpty: false) |> yield(name: "count")
power
  |> aggregateWindow(every: 1d, fn: (column, tables=<-) => tables |> integral(unit: 1h, column: column), createEmpty: false)
  |> yield(name: "integral")
data
  |> filter(fn: (r) => r._field == "energy_consumed" or r._field == "energy_produced")
  |> aggregateWindow(every: 1d, fn: spread, createEmpty: false)
  |> yield(name: "spread")
`;
  }

  private async query(flux: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.queryApi.collectRows<Record<string, unknown>>(flux);
    } catch (error) {
      // Never pass on the query text: it contains the signature.
      const reason = error instanceof Error ? error.name : 'unknown';
      throw new UpstreamError(`InfluxDB query failed (${reason})`);
    }
  }
}
