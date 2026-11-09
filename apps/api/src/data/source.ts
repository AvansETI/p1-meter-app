import type { Capabilities } from '@p1/shared';

/** Read access to household data; InfluxDB in production, a fake in tests. */
export interface HouseholdDataSource {
  /** Capabilities of a household, or `null` when it has no data in the last 30 days. */
  detect(signature: string): Promise<Capabilities | null>;
  ping(): Promise<boolean>;
}

/** The data store could not be reached or failed; details are logged, never returned. */
export class UpstreamError extends Error {
  override name = 'UpstreamError';
}
