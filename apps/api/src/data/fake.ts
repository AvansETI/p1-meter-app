import type { Capabilities } from '@p1/shared';
import { UpstreamError, type HouseholdDataSource } from './source';

/** In-memory data source for tests and UI work without InfluxDB. */
export class FakeDataSource implements HouseholdDataSource {
  calls = 0;
  available = true;

  constructor(private readonly households: Record<string, Capabilities> = {}) {}

  detect(signature: string): Promise<Capabilities | null> {
    this.calls++;
    if (!this.available) return Promise.reject(new UpstreamError('fake source unavailable'));
    return Promise.resolve(this.households[signature] ?? null);
  }

  ping(): Promise<boolean> {
    return Promise.resolve(this.available);
  }
}
