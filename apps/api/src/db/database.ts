import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** Numbered migrations; applied once, in order, each in a transaction. */
const MIGRATIONS: string[] = [
  `CREATE TABLE tariff_sets (
     signature  TEXT PRIMARY KEY,
     profiles   TEXT NOT NULL,
     version    INTEGER NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE tariff_versions (
     signature  TEXT NOT NULL,
     version    INTEGER NOT NULL,
     profiles   TEXT NOT NULL,
     created_at TEXT NOT NULL,
     PRIMARY KEY (signature, version)
   );`,
  // Computed daily costs per tariff profile (costs phase 3, #42).
  `CREATE TABLE daily_costs (
     signature      TEXT NOT NULL,
     profile        TEXT NOT NULL,
     day            TEXT NOT NULL,
     tariff_version INTEGER NOT NULL,
     json           TEXT NOT NULL,
     PRIMARY KEY (signature, profile, day)
   );`,
  // Gap handling changed (#49): recompute all cached costs.
  `DELETE FROM daily_costs;`,
];

/** Opens (and migrates) the app database in `dir` (docs/design/2026-11-09-costs.md §5). */
export function openDatabase(dir: string): DatabaseSync {
  if (dir !== ':memory:') mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(dir === ':memory:' ? dir : path.join(dir, 'p1.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db: DatabaseSync): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_version').get() as {
    v: number | null;
  };
  for (let v = (row.v ?? 0) + 1; v <= MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v - 1]!);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(v);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Writes a consistent copy to `<dir>/backups/p1-YYYY-MM-DD.db` once per day and keeps the
 * newest `keep` copies. Returns the file written, or undefined when today's backup exists.
 */
export function backupDaily(db: DatabaseSync, dir: string, now = new Date(), keep = 14) {
  const backups = path.join(dir, 'backups');
  mkdirSync(backups, { recursive: true });
  const file = path.join(backups, `p1-${now.toISOString().slice(0, 10)}.db`);
  const existing = readdirSync(backups).filter((f) => /^p1-\d{4}-\d{2}-\d{2}\.db$/.test(f));
  if (existing.includes(path.basename(file))) return undefined;
  db.prepare('VACUUM INTO ?').run(file);
  for (const old of [...existing, path.basename(file)].sort().reverse().slice(keep)) {
    rmSync(path.join(backups, old), { force: true });
  }
  return file;
}
