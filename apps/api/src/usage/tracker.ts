import { createHmac, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { zonedDate } from '../time';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date (Europe/Amsterdam) as YYYY-MM-DD. */
export function dayKey(instant: Date): string {
  const { year, month, day } = zonedDate(instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** First day of a window of `days` days ending today. */
const firstDay = (days: number, now: Date) => dayKey(new Date(now.getTime() - (days - 1) * DAY_MS));

/**
 * Which households used the app on which day (docs/design/2026-11-14-usage-stats.md §3).
 * Stores a salted hash per household and its last day of use, never the signature.
 */
export class UsageTracker {
  private readonly salt: string;
  /** `hash|day` already written, so repeated requests on one day cost no write. */
  private readonly written = new Set<string>();

  constructor(private readonly db: DatabaseSync) {
    this.salt =
      this.meta('usage_salt') ?? this.setMeta('usage_salt', randomBytes(32).toString('hex'));
  }

  /** Records that a household used the app on the day of `now`. */
  record(signature: string, now = new Date()): void {
    const hash = this.hash(signature);
    const day = dayKey(now);
    if (this.written.has(`${hash}|${day}`)) return;
    this.db
      .prepare(
        `INSERT INTO app_usage (hash, last_day) VALUES (?, ?)
         ON CONFLICT (hash) DO UPDATE SET last_day = MAX(last_day, excluded.last_day)`,
      )
      .run(hash, day);
    if (!this.meta('usage_since')) this.setMeta('usage_since', day);
    // Only today's entries matter; drop the rest when the day changes.
    if ([...this.written].some((key) => !key.endsWith(day))) this.written.clear();
    this.written.add(`${hash}|${day}`);
  }

  /** Salted hash of a signature; also keys gas reference values and profiles (#68). */
  hash(signature: string): string {
    return createHmac('sha256', this.salt).update(signature).digest('hex');
  }

  /** Distinct households that used the app in the last `days` days (including today). */
  activeUsers(days: number, now = new Date()): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM app_usage WHERE last_day >= ?')
      .get(firstDay(days, now)) as { n: number };
    return row.n;
  }

  /** The first day anything was recorded, or null. */
  since(): string | null {
    return this.meta('usage_since') ?? null;
  }

  /** Deletes households not seen in the last `days` days. */
  prune(days: number, now = new Date()): void {
    this.db.prepare('DELETE FROM app_usage WHERE last_day < ?').run(firstDay(days, now));
  }

  private meta(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
      { value: string } | undefined;
    return row?.value;
  }

  private setMeta(key: string, value: string): string {
    this.db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run(key, value);
    return value;
  }
}
