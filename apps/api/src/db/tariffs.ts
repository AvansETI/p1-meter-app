import { TariffProfilesSchema, type TariffProfiles, type TariffVersion } from '@p1/shared';
import type { DatabaseSync } from 'node:sqlite';

export interface StoredTariffs {
  profiles: TariffProfiles;
  version: number;
  updatedAt: string | null;
}

export class VersionConflictError extends Error {
  override name = 'VersionConflictError';
}

const EMPTY: TariffProfiles = { own: { periods: [] } };

/**
 * Tariff profiles per household with a full version history (design §5). Every save stores a
 * new version, so any earlier state can be restored (e.g. after a mistaken or malicious edit).
 */
export class TariffRepository {
  constructor(private readonly db: DatabaseSync) {}

  get(signature: string): StoredTariffs {
    const row = this.db
      .prepare('SELECT profiles, version, updated_at FROM tariff_sets WHERE signature = ?')
      .get(signature) as { profiles: string; version: number; updated_at: string } | undefined;
    if (!row) return { profiles: EMPTY, version: 0, updatedAt: null };
    return {
      profiles: TariffProfilesSchema.parse(JSON.parse(row.profiles)),
      version: row.version,
      updatedAt: row.updated_at,
    };
  }

  /** Saves new profiles if `expectedVersion` is still current; returns the new state. */
  save(
    signature: string,
    profiles: TariffProfiles,
    expectedVersion: number,
    now = new Date(),
  ): StoredTariffs {
    const json = JSON.stringify(profiles);
    const at = now.toISOString();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.get(signature).version;
      if (current !== expectedVersion) throw new VersionConflictError(`version is ${current}`);
      const version = current + 1;
      this.db
        .prepare(
          `INSERT INTO tariff_sets (signature, profiles, version, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(signature) DO UPDATE SET profiles = excluded.profiles,
             version = excluded.version, updated_at = excluded.updated_at`,
        )
        .run(signature, json, version, at);
      this.db
        .prepare(
          'INSERT INTO tariff_versions (signature, version, profiles, created_at) VALUES (?, ?, ?, ?)',
        )
        .run(signature, version, json, at);
      this.db.exec('COMMIT');
      return { profiles, version, updatedAt: at };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  versions(signature: string): TariffVersion[] {
    const rows = this.db
      .prepare(
        'SELECT version, profiles, created_at FROM tariff_versions WHERE signature = ? ORDER BY version DESC LIMIT 100',
      )
      .all(signature) as Array<{ version: number; profiles: string; created_at: string }>;
    return rows.map((row) => {
      const profiles = TariffProfilesSchema.parse(JSON.parse(row.profiles));
      return {
        version: row.version,
        createdAt: row.created_at,
        ownPeriods: profiles.own.periods.length,
        comparePeriods: profiles.compare?.periods.length ?? null,
        compareName: profiles.compare?.name ?? null,
      };
    });
  }

  /** Restores an earlier version as a new version; undefined when it does not exist. */
  restore(signature: string, version: number, now = new Date()): StoredTariffs | undefined {
    const row = this.db
      .prepare('SELECT profiles FROM tariff_versions WHERE signature = ? AND version = ?')
      .get(signature, version) as { profiles: string } | undefined;
    if (!row) return undefined;
    const current = this.get(signature).version;
    return this.save(signature, TariffProfilesSchema.parse(JSON.parse(row.profiles)), current, now);
  }
}
