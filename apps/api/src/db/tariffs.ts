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
      // Never reuse a number, also not one of a deleted current version (#91).
      const version = Math.max(current, this.lastVersion(signature)) + 1;
      this.db
        .prepare(
          `INSERT INTO tariff_sets (signature, profiles, version, updated_at, last_version)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(signature) DO UPDATE SET profiles = excluded.profiles,
             version = excluded.version, updated_at = excluded.updated_at,
             last_version = excluded.last_version`,
        )
        .run(signature, json, version, at, version);
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

  /**
   * Deletes a version (#91). Deleting the current version makes the newest remaining version
   * current again, with its own number. Returns the state afterwards; undefined when the version
   * does not exist. Throws VersionConflictError when `expectedVersion` is not current, or when
   * the current version is the only one.
   */
  delete(signature: string, version: number, expectedVersion: number): StoredTariffs | undefined {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.get(signature);
      if (current.version !== expectedVersion) {
        throw new VersionConflictError(`version is ${current.version}`);
      }
      const exists = this.db
        .prepare('SELECT 1 FROM tariff_versions WHERE signature = ? AND version = ?')
        .get(signature, version);
      if (!exists) {
        this.db.exec('ROLLBACK');
        return undefined;
      }
      let result = current;
      if (version === current.version) {
        const previous = this.db
          .prepare(
            `SELECT version, profiles, created_at FROM tariff_versions
             WHERE signature = ? AND version < ? ORDER BY version DESC LIMIT 1`,
          )
          .get(signature, version) as
          { version: number; profiles: string; created_at: string } | undefined;
        if (!previous) throw new VersionConflictError('the only version cannot be deleted');
        this.db
          .prepare(
            `UPDATE tariff_sets SET profiles = ?, version = ?, updated_at = ?,
               last_version = max(coalesce(last_version, version), ?)
             WHERE signature = ?`,
          )
          .run(previous.profiles, previous.version, previous.created_at, version, signature);
        result = {
          profiles: TariffProfilesSchema.parse(JSON.parse(previous.profiles)),
          version: previous.version,
          updatedAt: previous.created_at,
        };
      }
      this.db
        .prepare('DELETE FROM tariff_versions WHERE signature = ? AND version = ?')
        .run(signature, version);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private lastVersion(signature: string): number {
    const row = this.db
      .prepare('SELECT last_version FROM tariff_sets WHERE signature = ?')
      .get(signature) as { last_version: number | null } | undefined;
    return row?.last_version ?? 0;
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
