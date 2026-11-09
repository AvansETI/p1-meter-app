import type { DatabaseSync } from 'node:sqlite';
import type { Balance, DayCost, Unknown } from '../costs/engine';

export type ProfileKey = 'own' | 'compare';

export interface CachedDay {
  cost: DayCost | Unknown;
  /** Net-metering balance after this day, to continue the year from here. */
  balance: Balance;
}

/**
 * Cache of computed daily costs (docs/design/2026-11-09-costs.md §5). Rows belong to one
 * tariff version; rows of other versions are ignored and replaced.
 */
export class CostCache {
  constructor(private readonly db: DatabaseSync) {}

  /** Cached days of `version` in [from, to) (YYYY-MM-DD), keyed by day. */
  get(
    signature: string,
    profile: ProfileKey,
    version: number,
    from: string,
    to: string,
  ): Map<string, CachedDay> {
    const rows = this.db
      .prepare(
        `SELECT day, json FROM daily_costs
         WHERE signature = ? AND profile = ? AND tariff_version = ? AND day >= ? AND day < ?`,
      )
      .all(signature, profile, version, from, to) as Array<{ day: string; json: string }>;
    return new Map(rows.map((row) => [row.day, JSON.parse(row.json) as CachedDay]));
  }

  put(
    signature: string,
    profile: ProfileKey,
    version: number,
    days: Array<{ day: string } & CachedDay>,
  ): void {
    if (days.length === 0) return;
    const insert = this.db.prepare(
      `INSERT INTO daily_costs (signature, profile, day, tariff_version, json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (signature, profile, day)
       DO UPDATE SET tariff_version = excluded.tariff_version, json = excluded.json`,
    );
    this.db.exec('BEGIN');
    try {
      for (const { day, ...value } of days) {
        insert.run(signature, profile, day, version, JSON.stringify(value));
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
