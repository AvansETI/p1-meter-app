import { randomBytes } from 'node:crypto';
import { LRUCache } from 'lru-cache';

/** In-memory sessions: opaque ID → signature, with a sliding TTL. Lost on restart by design. */
export class SessionStore {
  private readonly sessions: LRUCache<string, string>;

  constructor(ttlMs: number, max = 10_000) {
    this.sessions = new LRUCache({ max, ttl: ttlMs, updateAgeOnGet: true });
  }

  create(signature: string): string {
    const id = randomBytes(16).toString('base64url');
    this.sessions.set(id, signature);
    return id;
  }

  get(id: string | undefined): string | undefined {
    return id ? this.sessions.get(id) : undefined;
  }

  delete(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }
}

/** Counts events per key within a fixed window, e.g. failed lookups per IP per hour. */
export class AttemptCounter {
  private readonly counts: LRUCache<string, number>;

  constructor(windowMs: number, max = 50_000) {
    // No updateAgeOnGet: the window starts at the first attempt.
    this.counts = new LRUCache({ max, ttl: windowMs });
  }

  count(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  add(key: string): number {
    const remaining = this.counts.getRemainingTTL(key);
    const next = this.count(key) + 1;
    this.counts.set(key, next, remaining > 0 ? { ttl: remaining } : undefined);
    return next;
  }

  /** Starts a full new window for this key, keeping its count (used for lock-outs). */
  restartWindow(key: string): void {
    this.counts.set(key, this.count(key));
  }

  /** Seconds until the window for this key ends (for `Retry-After`). */
  retryAfterSec(key: string): number {
    return Math.max(1, Math.ceil(this.counts.getRemainingTTL(key) / 1000));
  }
}
