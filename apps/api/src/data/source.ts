import type { Capabilities } from '@p1/shared';

/** Latest instantaneous power of one household. */
export interface PowerPoint {
  time: string;
  /** `power_consumed`, kW. */
  importKw: number;
  /** `power_produced`, kW. */
  exportKw: number;
}

/** Raw counter increases since a moment, per Influx field name. */
export type CounterDeltas = Partial<Record<CounterField, number>>;
export type CounterField = 'energy_consumed' | 'energy_produced' | 'gas_delivered';

/** One 5-minute window of mean power; null when the logger sent nothing. */
export interface PowerWindow {
  t: string;
  importKw: number | null;
  exportKw: number | null;
}

/** Gas counter per hour and the moments it increased (for the hourly-update check). */
export interface GasData {
  /** Start of hour (ms) → last `gas_delivered` value in that hour. */
  lastPerHour: Map<number, number>;
  /** Times (ms) at which the counter increased. */
  increaseTimes: number[];
}

/** Read access to household data; InfluxDB in production, a fake in tests. */
export interface HouseholdDataSource {
  /** Capabilities of a household, or `null` when it has no data in the last 30 days. */
  detect(signature: string): Promise<Capabilities | null>;
  /** Latest point in the last 10 minutes for each of the given households (one query). */
  latest(signatures: string[]): Promise<Map<string, PowerPoint>>;
  /** Most recent point in the last 30 days, for "last seen" when not live. */
  lastPoint(signature: string): Promise<PowerPoint | null>;
  /** Increase of the given counters since `since`. */
  counterDeltas(signature: string, since: Date, fields: CounterField[]): Promise<CounterDeltas>;
  /** Last counter value at or before each instant, looking back at most `lookbackMs`. */
  countersAt(
    signature: string,
    fields: CounterField[],
    instants: Date[],
    lookbackMs: number,
  ): Promise<Array<Partial<Record<CounterField, number>>>>;
  /** Last value per quarter hour (key: quarter start ms) of each counter in [from, to). */
  quarterCounters(
    signature: string,
    fields: CounterField[],
    from: Date,
    to: Date,
  ): Promise<Map<CounterField, Map<number, number>>>;
  /** Time of the household's first data point, or null. */
  firstPoint(signature: string): Promise<Date | null>;
  /** Gas counter per hour since `from`, and its increase times. */
  gasHourly(signature: string, from: Date): Promise<GasData>;
  /** 5-minute mean power over the last 24 hours. */
  recentPower(signature: string): Promise<PowerWindow[]>;
  ping(): Promise<boolean>;
}

/** The data store could not be reached or failed; details are logged, never returned. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';
}
