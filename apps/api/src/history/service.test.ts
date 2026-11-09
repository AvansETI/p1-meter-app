import { parsePlainDate, type Capabilities, type PlainDate } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { FakeDataSource } from '../data/fake';
import type { CounterField } from '../data/source';
import { periodBounds } from './buckets';
import { HistoryService } from './service';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const d = (value: string) => parsePlainDate(value) as PlainDate;
const caps = (overrides: Partial<Capabilities> = {}): Capabilities => ({
  hasGas: true,
  hasExport: true,
  importCounter: 'energy_produced', // swapped meter: import is in energy_produced
  counterOrientation: 'swapped',
  lastSeen: '2026-11-09T10:00:00Z',
  ...overrides,
});

/** Counters at each boundary of a week: import +10/day, export +2/day, gas +1/day. */
function weekCounters(date: PlainDate, skipDay?: number) {
  const bounds = periodBounds(date, 'week');
  const boundaries = [bounds.start, ...bounds.bucketStarts.slice(1), bounds.end];
  const counters = new Map<number, Partial<Record<CounterField, number>>>();
  boundaries.forEach((t, i) => {
    if (i === skipDay) return;
    counters.set(t, {
      energy_produced: 1000 + 10 * i,
      energy_consumed: 500 + 2 * i,
      gas_delivered: 50 + i,
    });
  });
  return { bounds, counters };
}

describe('HistoryService', () => {
  const now = Date.parse('2026-11-20T12:00:00Z'); // after the week below

  it('builds buckets and totals with the corrected counter orientation', async () => {
    const { counters } = weekCounters(d('2026-11-09'));
    const service = new HistoryService(
      new FakeDataSource({
        [SIG]: { capabilities: caps(), counters, firstPoint: new Date('2023-08-30T08:00:00Z') },
      }),
    );
    const history = await service.history(SIG, caps(), 'week', d('2026-11-11'), now);
    expect(history.buckets).toHaveLength(7);
    expect(history.buckets.map((b) => b.importKwh)).toEqual([10, 10, 10, 10, 10, 10, 10]);
    expect(history.buckets[0]).toMatchObject({ exportKwh: 2, netKwh: 8, gasM3: 1 });
    expect(history.totals).toEqual({
      importKwh: 70,
      exportKwh: 14,
      netKwh: 56,
      gasM3: 7,
      complete: true,
    });
    expect(history.firstData).toBe('2023-08-30');
  });

  it('marks gaps and incomplete totals', async () => {
    const { counters } = weekCounters(d('2026-11-09'), 3); // no value at the end of Wednesday
    const service = new HistoryService(
      new FakeDataSource({ [SIG]: { capabilities: caps(), counters } }),
    );
    const history = await service.history(SIG, caps(), 'week', d('2026-11-09'), now);
    expect(history.buckets.map((b) => b.importKwh)).toEqual([10, 10, null, 20, 10, 10, 10]);
    expect(history.buckets[3]).toMatchObject({ spansGap: true });
    expect(history.totals).toMatchObject({ importKwh: 70, complete: false });
  });

  it('leaves out export and gas for households without them', async () => {
    const { counters } = weekCounters(d('2026-11-09'));
    const plain = caps({ hasExport: false, hasGas: false });
    const service = new HistoryService(
      new FakeDataSource({ [SIG]: { capabilities: plain, counters } }),
    );
    const history = await service.history(SIG, plain, 'week', d('2026-11-09'), now);
    expect(history.buckets[0]).not.toHaveProperty('exportKwh');
    expect(history.buckets[0]).not.toHaveProperty('gasM3');
    expect(history.totals).toEqual({ importKwh: 70, complete: true });
  });

  it('compares with the previous period', async () => {
    const current = weekCounters(d('2026-11-09'));
    const prev = periodBounds(d('2026-11-02'), 'week');
    const counters = new Map(current.counters);
    counters.set(prev.start, { energy_produced: 900, energy_consumed: 480, gas_delivered: 40 });
    counters.set(prev.end, { energy_produced: 980, energy_consumed: 490, gas_delivered: 45 });
    const service = new HistoryService(
      new FakeDataSource({ [SIG]: { capabilities: caps(), counters } }),
    );
    const history = await service.history(SIG, caps(), 'week', d('2026-11-09'), now);
    expect(history.previous).toEqual({
      importKwh: 80,
      exportKwh: 10,
      netKwh: 70,
      gasM3: 5,
      complete: true,
    });
  });
});
