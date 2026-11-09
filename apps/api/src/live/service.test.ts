import type { Capabilities } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { FakeDataSource } from '../data/fake';
import { LiveService, toSnapshot } from './service';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const caps = (overrides: Partial<Capabilities> = {}): Capabilities => ({
  hasGas: true,
  hasExport: true,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
  ...overrides,
});

describe('toSnapshot', () => {
  const now = Date.parse('2026-11-09T12:00:30Z');
  it('computes net and status from age', () => {
    const point = { time: '2026-11-09T12:00:00Z', importKw: 0.31, exportKw: 0.12 };
    expect(toSnapshot(point, now)).toEqual({
      time: point.time,
      ageSec: 30,
      status: 'live',
      importKw: 0.31,
      exportKw: 0.12,
      netKw: 0.19,
    });
  });

  it('marks old points as stale or offline', () => {
    expect(toSnapshot({ time: '2026-11-09T11:54:00Z', importKw: 1, exportKw: 0 }, now).status).toBe(
      'stale',
    );
    expect(toSnapshot({ time: '2026-10-14T15:38:29Z', importKw: 1, exportKw: 0 }, now).status).toBe(
      'offline',
    );
  });
});

describe('LiveService.todayTotals', () => {
  const deltas = { energy_consumed: 5.4, energy_produced: 30.4, gas_delivered: 0.68 };

  it('uses the counters as named', async () => {
    const live = new LiveService(new FakeDataSource({ [SIG]: { capabilities: caps(), deltas } }));
    expect(await live.todayTotals(SIG, caps())).toMatchObject({
      importKwh: 5.4,
      exportKwh: 30.4,
      netKwh: -25,
      gasM3: 0.68,
    });
  });

  it('corrects swapped counters', async () => {
    const swapped = caps({ counterOrientation: 'swapped', importCounter: 'energy_produced' });
    const live = new LiveService(new FakeDataSource({ [SIG]: { capabilities: swapped, deltas } }));
    expect(await live.todayTotals(SIG, swapped)).toMatchObject({
      importKwh: 30.4,
      exportKwh: 5.4,
      netKwh: 25,
    });
  });

  it('leaves out export, net and gas when the household has none', async () => {
    const plain = caps({ hasExport: false, hasGas: false });
    const live = new LiveService(new FakeDataSource({ [SIG]: { capabilities: plain, deltas } }));
    const totals = await live.todayTotals(SIG, plain);
    expect(totals.importKwh).toBe(5.4);
    expect(totals).not.toHaveProperty('exportKwh');
    expect(totals).not.toHaveProperty('netKwh');
    expect(totals).not.toHaveProperty('gasM3');
  });
});

describe('LiveService.recentSeries', () => {
  it('computes net per window and keeps gaps as null', async () => {
    const recent = [
      { t: '2026-11-09T10:00:00Z', importKw: 1.5, exportKw: 0.5 },
      { t: '2026-11-09T10:05:00Z', importKw: null, exportKw: null },
      { t: '2026-11-09T10:10:00Z', importKw: 0.2, exportKw: null },
    ];
    const live = new LiveService(new FakeDataSource({ [SIG]: { capabilities: caps(), recent } }));
    expect((await live.recentSeries(SIG)).points).toEqual([
      { t: '2026-11-09T10:00:00Z', netKw: 1 },
      { t: '2026-11-09T10:05:00Z', netKw: null },
      { t: '2026-11-09T10:10:00Z', netKw: 0.2 },
    ]);
  });
});

describe('LiveService.snapshot', () => {
  it('falls back to the last point within 30 days', async () => {
    const lastPoint = { time: '2026-10-14T15:38:29Z', importKw: 0.18, exportKw: 0 };
    const live = new LiveService(
      new FakeDataSource({ [SIG]: { capabilities: caps(), lastPoint } }),
    );
    expect(await live.snapshot(SIG)).toMatchObject({ time: lastPoint.time, status: 'offline' });
  });
});
