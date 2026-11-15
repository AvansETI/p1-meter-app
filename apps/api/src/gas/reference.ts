import type { DatabaseSync } from 'node:sqlite';
import { REFERENCE_STATION } from '@p1/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { HouseholdDataSource } from '../data/source';
import type { OpenDataJob } from '../opendata/job';
import { zonedHour } from '../time';
import { dayKey } from '../usage/tracker';
import { REFERENCE_MAX_AGE_DAYS, type GasService } from './service';

const DAY_MS = 86_400_000;
/** KNMI has published the previous day by then (design §4.2). */
const RUN_FROM_HOUR = 11;
/** Households with gas data in this many days take part. */
const WINDOW_DAYS = 367;

/**
 * Nightly reference values for the comparison (design §4.1–4.2): the weather-corrected
 * consumption of the last 365 days of every household with gas, stored under its hash. Uses
 * the household's own station when its postcode region is known. Households are read one
 * after another with a pause, to keep the load on InfluxDB low; for households that use the
 * app the stored daily readings are topped up, for the others only the last year is read.
 */
export class ReferenceJob {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly source: HouseholdDataSource,
    private readonly gas: GasService,
    private readonly openData: OpenDataJob,
    private readonly db: DatabaseSync,
    private readonly hash: (signature: string) => string,
    private readonly log: FastifyBaseLogger,
    private readonly options: { pauseMs?: number; now?: () => Date } = {},
  ) {}

  start(intervalMs = 15 * 60_000): void {
    setTimeout(() => void this.tick(), 60_000).unref();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  private lastRun(): string | undefined {
    const row = this.db
      .prepare("SELECT value FROM app_meta WHERE key = 'gas_reference_day'")
      .get() as { value: string } | undefined;
    return row?.value;
  }

  /** Runs once a day after 11:00, and right away when it never ran. */
  async tick(): Promise<void> {
    const now = this.now();
    const today = dayKey(now);
    const last = this.lastRun();
    if (last === today || (last && zonedHour(now) < RUN_FROM_HOUR)) return;
    if (!this.openData.ready(REFERENCE_STATION)) return;
    await this.run();
  }

  async run(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const now = this.now();
      const today = dayKey(now);
      const from = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
      const signatures = await this.source.gasSignatures(from);
      let stored = 0;
      for (const signature of signatures) {
        try {
          if (await this.gas.updateReference(signature, from)) stored++;
        } catch (error) {
          this.log.warn({ err: error }, 'gas reference for a household failed');
        }
        await this.pause();
      }
      const stale = dayKey(new Date(now.getTime() - REFERENCE_MAX_AGE_DAYS * DAY_MS));
      this.db.prepare('DELETE FROM gas_reference WHERE updated_day < ?').run(stale);
      this.db
        .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('gas_reference_day', ?)")
        .run(today);
      this.log.info({ households: signatures.length, stored }, 'gas reference values updated');
      return stored;
    } catch (error) {
      this.log.warn({ err: error }, 'gas reference run failed');
      return 0;
    } finally {
      this.running = false;
    }
  }

  private pause() {
    const ms = this.options.pauseMs ?? 1_000;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
