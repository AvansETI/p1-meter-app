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

export function httpFetchers(entsoeToken: string): PriceFetchers {
  const get = async (url: string) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
export class PriceJob {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly store: PriceStore,
    private readonly fetchers: PriceFetchers,
    private readonly log: FastifyBaseLogger,
    private readonly options: { pauseMs?: number; now?: () => Date } = {},
  ) {}

  start(intervalMs = 60 * 60_000): void {
    // First run shortly after start-up, then every hour.
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

  /** One pass: recent days (incl. tomorrow) first, then the backfill. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const tomorrowEnd = dayStart(this.now(), 2);
      await this.fill('electricity', dayStart(this.now(), -7), tomorrowEnd);
      await this.fill('gas', dayStart(this.now(), -7), tomorrowEnd);
      await this.fill('electricity', zonedToUtc(BACKFILL_FROM), dayStart(this.now(), -7));
      await this.fill('gas', zonedToUtc(BACKFILL_FROM), dayStart(this.now(), -7));
    } catch (error) {
      this.log.warn({ err: error }, 'price job failed; retrying next hour');
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
