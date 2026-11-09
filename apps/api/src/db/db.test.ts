import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { TariffPeriod } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { CostCache } from './costs';
import { backupDaily, migrate, openDatabase } from './database';
import { TariffRepository, VersionConflictError } from './tariffs';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const period = (validFrom: string, perKwh: number): TariffPeriod => ({
  validFrom,
  electricity: { type: 'single', perKwh },
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  fixed: { supplierPerMonth: 7, gridPerMonth: 40 },
  taxReductionPerYear: 630,
});

const memory = () => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  return new TariffRepository(db);
};

describe('migrations', () => {
  it('are applied once', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    migrate(db);
    const versions = db.prepare('SELECT version FROM schema_version').all();
    expect(versions).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
  });
});

describe('TariffRepository', () => {
  it('starts empty and saves with increasing versions', () => {
    const repo = memory();
    expect(repo.get(SIG)).toEqual({
      profiles: { own: { periods: [] } },
      version: 0,
      updatedAt: null,
    });
    const first = repo.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    expect(first.version).toBe(1);
    const second = repo.save(
      SIG,
      {
        own: first.profiles.own,
        compare: { name: 'Dynamisch', periods: [period('2023-08-01', 0.2)] },
      },
      1,
    );
    expect(second.version).toBe(2);
    expect(repo.get(SIG).profiles.compare?.name).toBe('Dynamisch');
  });

  it('rejects a save based on an outdated version', () => {
    const repo = memory();
    repo.save(SIG, { own: { periods: [] } }, 0);
    expect(() => repo.save(SIG, { own: { periods: [] } }, 0)).toThrow(VersionConflictError);
    expect(repo.get(SIG).version).toBe(1);
  });

  it('lists versions and restores an earlier one as a new version', () => {
    const repo = memory();
    repo.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    repo.save(SIG, { own: { periods: [] } }, 1); // e.g. a mistaken edit
    expect(repo.versions(SIG).map((v) => [v.version, v.ownPeriods])).toEqual([
      [2, 0],
      [1, 1],
    ]);
    const restored = repo.restore(SIG, 1);
    expect(restored?.version).toBe(3);
    expect(repo.get(SIG).profiles.own.periods).toHaveLength(1);
    expect(repo.restore(SIG, 99)).toBeUndefined();
  });

  it('keeps households separate', () => {
    const repo = memory();
    repo.save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    expect(repo.get('2019-ETI-EMON-V01-FFFFFF-FFFFFF').version).toBe(0);
  });
});

describe('database file and backups', () => {
  it('creates the database and keeps at most `keep` daily backups', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'p1-db-'));
    const db = openDatabase(dir);
    new TariffRepository(db).save(SIG, { own: { periods: [period('2026-01-01', 0.3)] } }, 0);
    for (let day = 1; day <= 5; day++) {
      backupDaily(db, dir, new Date(`2026-11-0${day}T03:00:00Z`), 3);
    }
    expect(backupDaily(db, dir, new Date('2026-11-05T09:00:00Z'), 3)).toBeUndefined(); // once a day
    expect(readdirSync(path.join(dir, 'backups')).sort()).toEqual([
      'p1-2026-11-03.db',
      'p1-2026-11-04.db',
      'p1-2026-11-05.db',
    ]);
    const copy = new DatabaseSync(path.join(dir, 'backups', 'p1-2026-11-05.db'));
    expect(new TariffRepository(copy).get(SIG).version).toBe(1);
  });
});

describe('CostCache', () => {
  const day = (cost: number) => ({
    cost: {
      electricityEur: cost,
      gasEur: 0,
      fixedEur: 0,
      taxReductionEur: 0,
      totalEur: cost,
      estimated: false,
    },
    balance: { year: 2026, total: 0, normal: 0, offPeak: 0 },
  });

  it('returns days of the current tariff version and drops older versions on write', () => {
    const db = openDatabase(':memory:');
    const cache = new CostCache(db);
    cache.put(SIG, 'own', 1, [{ day: '2026-01-01', ...day(1) }]);
    expect(cache.get(SIG, 'own', 1, '2026-01-01', '2026-01-02').get('2026-01-01')).toEqual(day(1));
    expect(cache.get(SIG, 'own', 2, '2026-01-01', '2026-01-02').size).toBe(0);

    cache.put(SIG, 'own', 2, [{ day: '2026-01-02', ...day(2) }]);
    const count = db.prepare('SELECT COUNT(*) AS n FROM daily_costs').get() as { n: number };
    expect(count.n).toBe(1);
  });
});
