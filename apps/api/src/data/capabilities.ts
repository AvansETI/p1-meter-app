import type { Capabilities } from '@p1/shared';
import { LRUCache } from 'lru-cache';
import type { HouseholdDataSource } from './source';

const HOUR_MS = 60 * 60 * 1000;
type Entry = { capabilities: Capabilities | null };

/**
 * Caches capability detection per signature: found for 24 h, not found for 5 minutes
 * (limits InfluxDB load from repeated attempts). Concurrent lookups share one query.
 */
export class CapabilityService {
  private readonly cache = new LRUCache<string, Entry>({ max: 10_000 });
  private readonly inflight = new Map<string, Promise<Capabilities | null>>();

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly ttl = { found: 24 * HOUR_MS, notFound: 5 * 60 * 1000 },
  ) {}

  async get(signature: string): Promise<Capabilities | null> {
    const cached = this.cache.get(signature);
    if (cached) return cached.capabilities;

    let pending = this.inflight.get(signature);
    if (!pending) {
      pending = this.source.detect(signature).finally(() => this.inflight.delete(signature));
      this.inflight.set(signature, pending);
    }
    const capabilities = await pending;
    this.cache.set(
      signature,
      { capabilities },
      { ttl: capabilities ? this.ttl.found : this.ttl.notFound },
    );
    return capabilities;
  }
}
