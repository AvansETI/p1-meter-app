import { InfluxDB, type QueryApi } from '@influxdata/influxdb-client';
import { DEFAULT_PROFILE, SIGNATURE_PATTERN, type Capabilities } from '@p1/shared';
import { decideOrientation, type DayStats } from './orientation';
import {
  UpstreamError,
  type CounterDeltas,
  type CounterField,
  type GasData,
  type HouseholdDataSource,
  type PowerPoint,
  type PowerWindow,
} from './source';

export interface InfluxOptions {
  url: string;
  org: string;
  bucket: string;
  token: string;
  timeoutMs: number;
}

const DETECTION_WINDOW = '-30d';
/** Max signatures per regex filter, to keep queries a sane size. */
const LATEST_BATCH = 200;

const num = (value: unknown) => (typeof value === 'number' ? value : null);

/** Groups rows of power fields into one PowerPoint per signature (latest time wins). */
function toPowerPoints(rows: Record<string, unknown>[]): Map<string, PowerPoint> {
  const points = new Map<string, PowerPoint>();
  for (const row of rows) {
    const { signature, _field, _time } = row;
    const value = num(row._value);
    if (typeof signature !== 'string' || typeof _time !== 'string' || value === null) continue;
    const point = points.get(signature) ?? { time: _time, importKw: 0, exportKw: 0 };
    if (_time > point.time) point.time = _time;
    if (_field === 'power_consumed') point.importKw = value;
    if (_field === 'power_produced') point.exportKw = value;
    points.set(signature, point);
  }
  return points;
}

/** Flux string literal; JSON escaping is a valid subset of Flux string escaping. */
const literal = (value: string) => JSON.stringify(value);

/**
 * Short, log-safe description of a query error: name, HTTP status and message, plus the
 * underlying cause (e.g. ECONNREFUSED, certificate errors). Never the query text, which
 * contains the signature; any signature in a message is masked by the logger as well.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const status = (error as { statusCode?: unknown }).statusCode;
  const cause = error.cause instanceof Error ? error.cause : undefined;
  const causeCode = (cause as { code?: unknown } | undefined)?.code;
  const parts = [
    error.name,
    typeof status === 'number' ? `HTTP ${status}` : undefined,
    error.message.slice(0, 200),
    cause
      ? `cause: ${typeof causeCode === 'string' ? causeCode + ' ' : ''}${cause.message.slice(0, 200)}`
      : undefined,
  ];
  return parts.filter(Boolean).join(' — ');
}

/** Values are inlined into Flux (OSS has no query parameters), so only normalized IDs pass. */
function assertNormalized(signature: string): void {
  if (!SIGNATURE_PATTERN.test(signature)) throw new Error('signature must be normalized');
}

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
    assertNormalized(signature);

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

  async latest(signatures: string[]): Promise<Map<string, PowerPoint>> {
    const result = new Map<string, PowerPoint>();
    for (let i = 0; i < signatures.length; i += LATEST_BATCH) {
      const batch = signatures.slice(i, i + LATEST_BATCH);
      batch.forEach(assertNormalized);
      // A regex on the tag is pushed down to storage; contains() is not.
      const pattern = `/^(${batch.join('|')})$/`;
      const rows = await this.query(`
from(bucket: ${literal(this.options.bucket)})
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature =~ ${pattern})
  |> filter(fn: (r) => r._field == "power_consumed" or r._field == "power_produced")
  |> last()`);
      for (const [sig, point] of toPowerPoints(rows)) result.set(sig, point);
    }
    return result;
  }

  async lastPoint(signature: string): Promise<PowerPoint | null> {
    assertNormalized(signature);
    const rows = await this.query(`
from(bucket: ${literal(this.options.bucket)})
  |> range(start: ${DETECTION_WINDOW})
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => r._field == "power_consumed" or r._field == "power_produced")
  |> last()`);
    return toPowerPoints(rows).get(signature) ?? null;
  }

  async counterDeltas(
    signature: string,
    since: Date,
    fields: CounterField[],
  ): Promise<CounterDeltas> {
    assertNormalized(signature);
    if (fields.length === 0) return {};
    const fieldFilter = fields.map((f) => `r._field == ${literal(f)}`).join(' or ');
    const rows = await this.query(`
from(bucket: ${literal(this.options.bucket)})
  |> range(start: ${since.toISOString()})
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => ${fieldFilter})
  |> spread()`);
    const deltas: CounterDeltas = {};
    for (const row of rows) {
      const value = num(row._value);
      if (value !== null && fields.includes(row._field as CounterField)) {
        deltas[row._field as CounterField] = value;
      }
    }
    return deltas;
  }

  async countersAt(
    signature: string,
    fields: CounterField[],
    instants: Date[],
    lookbackMs: number,
  ): Promise<Array<Partial<Record<CounterField, number>>>> {
    assertNormalized(signature);
    if (instants.length === 0) return [];
    const fieldFilter = fields.map((f) => `r._field == ${literal(f)}`).join(' or ');
    const parts = instants.map(
      (instant, i) => `from(bucket: ${literal(this.options.bucket)})
  |> range(start: ${new Date(instant.getTime() - lookbackMs).toISOString()}, stop: ${new Date(instant.getTime() + 1).toISOString()})
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => ${fieldFilter})
  |> last()
  |> yield(name: "at${i}")`,
    );
    const rows = await this.query(parts.join('\n'));
    const result = instants.map((): Partial<Record<CounterField, number>> => ({}));
    for (const row of rows) {
      const index = Number(String(row.result).replace('at', ''));
      const value = num(row._value);
      const target = result[index];
      if (target && value !== null && fields.includes(row._field as CounterField)) {
        target[row._field as CounterField] = value;
      }
    }
    return result;
  }

  async firstPoint(signature: string): Promise<Date | null> {
    assertNormalized(signature);
    const rows = await this.query(`
from(bucket: ${literal(this.options.bucket)})
  |> range(start: 0)
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => r._field == "power_consumed")
  |> first()`);
    const time = rows[0]?._time;
    return typeof time === 'string' ? new Date(time) : null;
  }

  async gasHourly(signature: string, from: Date): Promise<GasData> {
    assertNormalized(signature);
    const rows = await this.query(`
gas = from(bucket: ${literal(this.options.bucket)})
  |> range(start: ${from.toISOString()})
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => r._field == "gas_delivered")
gas
  |> aggregateWindow(every: 1h, fn: last, createEmpty: false, timeSrc: "_start")
  |> yield(name: "hourly")
gas
  |> difference()
  |> filter(fn: (r) => r._value > 0.0)
  |> keep(columns: ["_time", "_value"])
  |> yield(name: "increases")`);
    const lastPerHour = new Map<number, number>();
    const increaseTimes: number[] = [];
    for (const row of rows) {
      const value = num(row._value);
      if (typeof row._time !== 'string' || value === null) continue;
      if (row.result === 'hourly') lastPerHour.set(Date.parse(row._time), value);
      if (row.result === 'increases') increaseTimes.push(Date.parse(row._time));
    }
    return { lastPerHour, increaseTimes };
  }

  async recentPower(signature: string): Promise<PowerWindow[]> {
    assertNormalized(signature);
    const rows = await this.query(`
from(bucket: ${literal(this.options.bucket)})
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == ${literal(DEFAULT_PROFILE.measurement)} and r.signature == ${literal(signature)})
  |> filter(fn: (r) => r._field == "power_consumed" or r._field == "power_produced")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: true)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])`);
    return rows.flatMap((row) =>
      typeof row._time === 'string'
        ? [{ t: row._time, importKw: num(row.power_consumed), exportKw: num(row.power_produced) }]
        : [],
    );
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(new URL('/ping', this.options.url), {
        // A ping is a quick reachability check; do not wait the full query timeout.
        signal: AbortSignal.timeout(Math.min(this.options.timeoutMs, 3000)),
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
      throw new UpstreamError(`InfluxDB query failed: ${describeError(error)}`);
    }
  }
}
