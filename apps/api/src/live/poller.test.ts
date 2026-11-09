import type { Capabilities } from '@p1/shared';
import { pino } from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeDataSource } from '../data/fake';
import { LivePoller } from './poller';
import { LiveService } from './service';

const caps = { hasGas: false, hasExport: false } as Capabilities;
const point = (importKw: number) => ({ time: new Date().toISOString(), importKw, exportKw: 0 });
const A = '2019-ETI-EMON-V01-A1B2C3-000001';
const B = '2019-ETI-EMON-V01-A1B2C3-000002';

function setup() {
  const source = new FakeDataSource({
    [A]: { capabilities: caps, latest: point(1) },
    [B]: { capabilities: caps, latest: point(2) },
  });
  const poller = new LivePoller(source, new LiveService(source), pino({ level: 'silent' }), 10_000);
  return { source, poller };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('LivePoller', () => {
  it('sends the current snapshot right after subscribing', async () => {
    const { poller } = setup();
    const listener = vi.fn();
    const stop = poller.subscribe(A, listener);
    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ netKw: 1 })),
    );
    stop();
  });

  it('queries all subscribed households in one call per tick', async () => {
    const { source, poller } = setup();
    const a = vi.fn();
    const b = vi.fn();
    const stopA = poller.subscribe(A, a);
    const stopB = poller.subscribe(B, b);
    const stopB2 = poller.subscribe(B, b);
    source.latestCalls = [];
    await poller.tick();
    expect(source.latestCalls).toEqual([[A, B]]);
    expect(b).toHaveBeenCalledWith(expect.objectContaining({ netKw: 2 }));
    stopA();
    stopB();
    stopB2();
  });

  it('runs only while there are subscribers', () => {
    vi.useFakeTimers();
    const { poller } = setup();
    expect(poller.running).toBe(false);
    const stop = poller.subscribe(A, vi.fn());
    expect(poller.running).toBe(true);
    stop();
    expect(poller.running).toBe(false);
  });

  it('survives an unreachable data source', async () => {
    const { source, poller } = setup();
    const stop = poller.subscribe(A, vi.fn());
    source.available = false;
    await expect(poller.tick()).resolves.toBeUndefined();
    stop();
  });
});
