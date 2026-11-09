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

/** Read access to household data; InfluxDB in production, a fake in tests. */
export interface HouseholdDataSource {
  /** Capabilities of a household, or `null` when it has no data in the last 30 days. */
  detect(signature: string): Promise<Capabilities | null>;
  /** Latest point in the last 2 minutes for each of the given households (one query). */
  latest(signatures: string[]): Promise<Map<string, PowerPoint>>;
  /** Most recent point in the last 30 days, for "last seen" when not live. */
  lastPoint(signature: string): Promise<PowerPoint | null>;
  /** Increase of the given counters since `since`. */
  counterDeltas(signature: string, since: Date, fields: CounterField[]): Promise<CounterDeltas>;
  /** 5-minute mean power over the last 24 hours. */
  recentPower(signature: string): Promise<PowerWindow[]>;
  ping(): Promise<boolean>;
}

/** The data store could not be reached or failed; details are logged, never returned. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';
}
