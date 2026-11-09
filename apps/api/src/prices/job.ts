import type { FastifyBaseLogger } from 'fastify';
import { zonedDate, zonedToUtc } from '../time';
import { energyZeroGasUrl, parseEnergyZero } from './energyzero';
import { entsoeUrl, parseEntsoe } from './entsoe';
import type { PriceKind, PriceStore } from './store';

const DAY_MS = 86_400_000;
/** A day counts as complete with at least this many points (hourly days have 23–25). */
const MIN_POINTS_PER_DAY = 23;
/** First household data is from August 2023. */
export const BACKFILL_FROM = { year: 2023, month: 8, day: 1 };

export interface PriceFetchers {
  electricity(from: Date, to: Date): Promise<ReturnType<typeof parseEntsoe>>;
  gas(from: Date, to: Date): Promise<ReturnType<typeof parseEnergyZero>>;
}

/** A failed price request; `retryAfterMs` from a Retry-After header when the source sent one. */
export class FetchError extends Error {
  override name = 'FetchError';
  constructor(
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(`HTTP ${status}`);
  }
}

/** Retry-After as seconds or an HTTP date (RFC 9110), in milliseconds from `now`. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

export function httpFetchers(entsoeToken: string): PriceFetchers {
  const get = async (url: string) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new FetchError(res.status, parseRetryAfter(res.headers.get('retry-after')));
    return res;
  };
  return {
    electricity: async (from, to) =>
      parseEntsoe(await (await get(entsoeUrl(entsoeToken, from, to))).text()),
    gas: async (from, to) => parseEnergyZero(await (await get(energyZeroGasUrl(from, to))).json()),
  };
}

/** Local midnight of the day containing `instant`, plus `days`. */
const dayStart = (instant: Date, days = 0) => {
  const d = zonedDate(instant);
  return zonedToUtc({ year: d.year, month: d.month, day: d.day + days });
};

/**
 * Keeps the price bucket filled (design §4.3): tomorrow's prices once published, the last 7 days
 * when something is missing, and a one-time backfill since August 2023. Idempotent: rewriting a
 * point with the same timestamp overwrites it.
 */
const HOUR_MS = 3_600_000;
/** Normal cadence per source; longer after failures (doubling, at most a day). */
const NORMAL_INTERVAL_MS = HOUR_MS;
const MAX_BACKOFF_MS = 24 * HOUR_MS;

export type PriceSourceStatus = 'pending' | 'ok' | 'backoff';

interface SourceState {
  failures: number;
  nextAttemptAt: number;
  status: PriceSourceStatus;
}

export class PriceJob {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private readonly sources: Record<PriceKind, SourceState> = {
    electricity: { failures: 0, nextAttemptAt: 0, status: 'pending' },
    gas: { failures: 0, nextAttemptAt: 0, status: 'pending' },
  };

  constructor(
    private readonly store: PriceStore,
    private readonly fetchers: PriceFetchers,
    private readonly log: FastifyBaseLogger,
    private readonly options: {
      pauseMs?: number;
      now?: () => Date;
      /** Start of the backfill; tests use a short one. */
      backfillFrom?: typeof BACKFILL_FROM;
    } = {},
  ) {}

  /** Status per source for /api/v1/health. */
  status(): Record<PriceKind, PriceSourceStatus> {
    return { electricity: this.sources.electricity.status, gas: this.sources.gas.status };
  }

  start(intervalMs = 5 * 60_000): void {
    // Checks every 5 minutes; each source fetches at most hourly unless a Retry-After says
    // otherwise. The first run is shortly after start-up.
    setTimeout(() => void this.tick(), 5_000).unref();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  /**
   * One pass. Electricity and gas run independently: a failing source backs off (Retry-After,
   * else 1 h, 2 h, 4 h … up to 24 h) without holding up the other one.
   */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const kind of ['electricity', 'gas'] as const) {
        const state = this.sources[kind];
        const now = this.now().getTime();
        if (now < state.nextAttemptAt) continue;
        try {
          // Recent days (incl. tomorrow) first, then the backfill since August 2023.
          await this.fill(kind, dayStart(this.now(), -7), dayStart(this.now(), 2));
          await this.fill(
            kind,
            zonedToUtc(this.options.backfillFrom ?? BACKFILL_FROM),
            dayStart(this.now(), -7),
          );
          state.failures = 0;
          state.status = 'ok';
          state.nextAttemptAt = now + NORMAL_INTERVAL_MS;
        } catch (error) {
          state.failures++;
          const retryAfter = error instanceof FetchError ? error.retryAfterMs : undefined;
          const backoff = Math.min(MAX_BACKOFF_MS, NORMAL_INTERVAL_MS * 2 ** (state.failures - 1));
          const delay = retryAfter ?? backoff;
          state.status = 'backoff';
          state.nextAttemptAt = now + delay;
          this.log.warn(
            { err: error, kind, failures: state.failures, retryInMin: Math.round(delay / 60_000) },
            'price fetch failed; backing off',
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Fetches every incomplete day in [from, to), in chunks of up to 31 days. */
  async fill(kind: PriceKind, from: Date, to: Date): Promise<number> {
    const counts = await this.store.pointsPerDay(kind, from, to);
    const missing: Date[] = [];
    for (let day = from; day < to; day = dayStart(new Date(day.getTime() + DAY_MS + 3_600_000))) {
      if ((counts.get(day.getTime()) ?? 0) < MIN_POINTS_PER_DAY) missing.push(day);
    }
    let written = 0;
    // Group consecutive missing days into chunks to keep the number of requests low.
    for (let i = 0; i < missing.length;) {
      const start = missing[i]!;
      let j = i;
      while (
        j + 1 < missing.length &&
        j - i < 30 &&
        missing[j + 1]!.getTime() - missing[j]!.getTime() <= DAY_MS + 3_600_000
      ) {
        j++;
      }
      const end = dayStart(new Date(missing[j]!.getTime() + DAY_MS + 3_600_000));
      if (kind === 'electricity') {
        const points = await this.fetchers.electricity(start, end);
        if (points.length > 0) await this.store.writeElectricity(points);
        written += points.length;
      } else {
        const points = await this.fetchers.gas(start, end);
        if (points.length > 0) await this.store.writeGas(points);
        written += points.length;
      }
      if (written > 0) {
        this.log.info(
          { kind, from: start.toISOString(), to: end.toISOString(), written },
          'prices stored',
        );
      }
      i = j + 1;
      if (this.options.pauseMs) await new Promise((r) => setTimeout(r, this.options.pauseMs));
    }
    return written;
  }
}
