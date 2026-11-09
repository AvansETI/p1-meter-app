import type { LiveSnapshot } from '@p1/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { HouseholdDataSource } from '../data/source';
import { toSnapshot, type LiveService } from './service';

export type LiveListener = (snapshot: LiveSnapshot) => void;

/**
 * One poller for all open live streams: every tick a single query fetches the latest point of
 * every subscribed household, so InfluxDB load does not grow with the number of open tabs.
 */
export class LivePoller {
  private readonly listeners = new Map<string, Set<LiveListener>>();
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly live: LiveService,
    private readonly log: FastifyBaseLogger,
    private readonly intervalMs = 10_000,
  ) {}

  get running(): boolean {
    return this.timer !== undefined;
  }

  /** Subscribes and immediately sends the current snapshot; returns the unsubscribe function. */
  subscribe(signature: string, listener: LiveListener): () => void {
    let set = this.listeners.get(signature);
    if (!set) {
      set = new Set();
      this.listeners.set(signature, set);
    }
    set.add(listener);
    this.timer ??= setInterval(() => void this.tick(), this.intervalMs);

    this.live.snapshot(signature).then(
      (snapshot) => {
        if (snapshot && set.has(listener)) listener(snapshot);
      },
      (error: unknown) => this.log.warn({ err: error }, 'initial live snapshot failed'),
    );

    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(signature);
      if (this.listeners.size === 0) this.stop();
    };
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    const signatures = [...this.listeners.keys()];
    if (signatures.length === 0) return;
    try {
      const points = await this.source.latest(signatures);
      this.live.remember(points);
      for (const signature of signatures) {
        const point = points.get(signature) ?? (await this.live.lastPoint(signature));
        if (!point) continue;
        const snapshot = toSnapshot(point);
        for (const listener of this.listeners.get(signature) ?? []) listener(snapshot);
      }
    } catch (error) {
      // Clients keep their last snapshot and age it themselves.
      this.log.warn({ err: error }, 'live poll failed');
    }
  }
}
