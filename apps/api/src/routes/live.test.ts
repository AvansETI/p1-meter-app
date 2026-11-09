import type { Capabilities } from '@p1/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { FakeDataSource } from '../data/fake';
import { buildServer } from '../server';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const CAPS: Capabilities = {
  hasGas: true,
  hasExport: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
};

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup() {
  const source = new FakeDataSource({
    [SIG]: {
      capabilities: CAPS,
      latest: { time: new Date().toISOString(), importKw: 0.31, exportKw: 0.12 },
      deltas: { energy_consumed: 1.6, gas_delivered: 0.4 },
      recent: [{ t: '2026-11-09T10:00:00Z', importKw: 1, exportKw: 0 }],
    },
  });
  const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), {
    source,
    heartbeatMs: 50,
  });
  apps.push(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/session',
    payload: { emonId: 'A1B2C3-000000' },
  });
  const { sessionId } = res.json<{ sessionId: string }>();
  return { app, sessionId };
}

describe('live routes', () => {
  it('require a session', async () => {
    const { app } = await setup();
    for (const url of ['/api/v1/live', '/api/v1/live/today', '/api/v1/live/recent']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(401);
    }
  });

  it('return snapshot, today and recent data', async () => {
    const { app, sessionId } = await setup();
    const headers = { 'x-session': sessionId };
    const live = await app.inject({ method: 'GET', url: '/api/v1/live', headers });
    expect(live.json()).toMatchObject({ status: 'live', netKw: 0.19 });

    const today = await app.inject({ method: 'GET', url: '/api/v1/live/today', headers });
    expect(today.json()).toMatchObject({ importKwh: 1.6, gasM3: 0.4 });
    expect(today.json()).not.toHaveProperty('exportKwh');

    const recent = await app.inject({ method: 'GET', url: '/api/v1/live/recent', headers });
    expect(recent.json()).toEqual({
      stepSec: 300,
      points: [{ t: '2026-11-09T10:00:00Z', netKw: 1 }],
    });
  });
});

describe('GET /api/v1/live/gas', () => {
  it('returns 24 hourly values for a household with gas', async () => {
    const { app, sessionId } = await setup();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/live/gas',
      headers: { 'x-session': sessionId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ hours: unknown[]; hourlyUpdates: boolean }>().hours).toHaveLength(24);
  });
});

describe('GET /api/v1/live/stream', () => {
  it('streams server-sent events with a first snapshot and heartbeats', async () => {
    const { app, sessionId } = await setup();
    const base = await app.listen({ port: 0, host: '127.0.0.1' });
    const controller = new AbortController();
    const res = await fetch(`${base}/api/v1/live/stream?session=${sessionId}`, {
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('x-accel-buffering')).toBe('no');

    const reader = res.body!.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    const decoder = new TextDecoder();
    let text = '';
    while (!(text.includes('event: live') && text.includes(': ping'))) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    expect(text).toContain('retry: 5000');
    const data = /event: live\ndata: (.+)\n/.exec(text)?.[1];
    expect(JSON.parse(data!)).toMatchObject({ netKw: 0.19, status: 'live' });
    controller.abort();
  });

  it('allows at most two streams per session', async () => {
    const { app, sessionId } = await setup();
    const base = await app.listen({ port: 0, host: '127.0.0.1' });
    const controllers = [new AbortController(), new AbortController(), new AbortController()];
    const open = (c: AbortController) =>
      fetch(`${base}/api/v1/live/stream?session=${sessionId}`, { signal: c.signal });
    const first = await open(controllers[0]!);
    const second = await open(controllers[1]!);
    const third = await open(controllers[2]!);
    expect([first.status, second.status, third.status]).toEqual([200, 200, 429]);
    controllers.forEach((c) => c.abort());
  });

  it('rejects a stream without a valid session', async () => {
    const { app } = await setup();
    const res = await app.inject({ method: 'GET', url: '/api/v1/live/stream?session=nope' });
    expect(res.statusCode).toBe(401);
  });
});
