import { describe, expect, it } from 'vitest';
import { openDatabase } from '../db/database';
import { UsageTracker, dayKey } from './tracker';

const SIG_A = '2019-ETI-EMON-V01-A1B2C3-000000';
const SIG_B = '2019-ETI-EMON-V01-A1B2C3-000001';
const at = (iso: string) => new Date(iso);

describe('dayKey', () => {
  it('uses the Amsterdam calendar date', () => {
    expect(dayKey(at('2026-11-14T22:59:00Z'))).toBe('2026-11-14');
    expect(dayKey(at('2026-11-14T23:01:00Z'))).toBe('2026-11-15');
  });
});

describe('UsageTracker', () => {
  it('counts each household once, however often it is used', () => {
    const tracker = new UsageTracker(openDatabase(':memory:'));
    const now = at('2026-11-14T12:00:00Z');
    tracker.record(SIG_A, now);
    tracker.record(SIG_A, now);
    tracker.record(SIG_A, at('2026-11-13T12:00:00Z'));
    tracker.record(SIG_B, now);
    expect(tracker.activeUsers(30, now)).toBe(2);
  });

  it('counts the last 30 days including today', () => {
    const db = openDatabase(':memory:');
    const tracker = new UsageTracker(db);
    tracker.record(SIG_A, at('2026-10-16T12:00:00Z')); // 30th day back
    tracker.record(SIG_B, at('2026-10-15T12:00:00Z')); // 31st day back
    const now = at('2026-11-14T12:00:00Z');
    expect(tracker.activeUsers(30, now)).toBe(1);
    tracker.prune(30, now);
    expect(db.prepare('SELECT COUNT(*) AS n FROM app_usage').get()).toEqual({ n: 1 });
  });

  it('moves the last day forward, never back', () => {
    const tracker = new UsageTracker(openDatabase(':memory:'));
    tracker.record(SIG_A, at('2026-11-14T12:00:00Z'));
    tracker.record(SIG_A, at('2026-10-01T12:00:00Z'));
    expect(tracker.activeUsers(1, at('2026-11-14T12:00:00Z'))).toBe(1);
  });

  it('stores no signature, and keeps its salt', () => {
    const db = openDatabase(':memory:');
    new UsageTracker(db).record(SIG_A, at('2026-11-14T12:00:00Z'));
    const rows = db.prepare('SELECT hash FROM app_usage').all() as { hash: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(db.prepare('SELECT * FROM app_meta').all())).not.toContain('A1B2C3');

    // A second tracker on the same database (a restart) hashes the same way.
    new UsageTracker(db).record(SIG_A, at('2026-11-15T12:00:00Z'));
    expect(db.prepare('SELECT COUNT(*) AS n FROM app_usage').get()).toEqual({ n: 1 });
  });

  it('remembers the first day of counting', () => {
    const tracker = new UsageTracker(openDatabase(':memory:'));
    expect(tracker.since()).toBeNull();
    tracker.record(SIG_A, at('2026-11-14T12:00:00Z'));
    tracker.record(SIG_B, at('2026-11-20T12:00:00Z'));
    expect(tracker.since()).toBe('2026-11-14');
  });
});
