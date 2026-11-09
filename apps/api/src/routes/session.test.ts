import type { Capabilities } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { FakeDataSource } from '../data/fake';
import { buildServer } from '../server';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const CAPS: Capabilities = {
  hasGas: true,
  hasExport: true,
  importCounter: 'energy_produced',
  counterOrientation: 'swapped',
  lastSeen: '2026-11-09T10:00:00Z',
};

async function setup(env: Record<string, string> = {}) {
  const source = new FakeDataSource({ [SIG]: CAPS });
  const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...env }), {
    source,
  });
  const post = (emonId: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: '/api/v1/session', payload: { emonId }, headers });
  return { app, source, post };
}

describe('POST /api/v1/session', () => {
  it('opens a session for a known EMON ID in any input form', async () => {
    const { app, post } = await setup();
    const res = await post('a1b2 c300-0000');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ signature: SIG, capabilities: CAPS });
    expect(res.json<{ sessionId: string }>().sessionId).toMatch(/^[\w-]{22}$/);
    await app.close();
  });

  it.each(['', 'A1B2C3', 'not-hex-at-all', 42])('rejects %j as invalid_format', async (emonId) => {
    const { app, post } = await setup();
    const res = await post(emonId);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_format' });
    await app.close();
  });

  it('rejects malformed JSON as invalid_format', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/session',
      payload: '{nope',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_format' });
    await app.close();
  });

  it('answers not_found for unknown IDs', async () => {
    const { app, post } = await setup();
    const res = await post('FFFFFF-FFFFFF');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
    await app.close();
  });

  it('locks out an IP after repeated failed lookups, without querying the source', async () => {
    const { app, source, post } = await setup({ FAILED_LOOKUPS_PER_HOUR: '3' });
    for (const id of ['FFFFFF-000001', 'FFFFFF-000002', 'FFFFFF-000003']) {
      expect((await post(id)).statusCode).toBe(404);
    }
    const calls = source.calls;
    const blocked = await post('A1B2C3-000000');
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: 'rate_limited' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(3500);
    expect(source.calls).toBe(calls);
    await app.close();
  });

  it('limits session attempts per minute', async () => {
    const { app, post } = await setup({ SESSION_LIMIT_PER_MINUTE: '2' });
    await post('A1B2C3-000000');
    await post('A1B2C3-000000');
    const res = await post('A1B2C3-000000');
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'rate_limited' });
    await app.close();
  });

  it('limits session attempts per day', async () => {
    const { app, post } = await setup({ SESSION_LIMIT_PER_DAY: '2' });
    await post('A1B2C3-000000');
    await post('A1B2C3-000000');
    expect((await post('A1B2C3-000000')).statusCode).toBe(429);
    await app.close();
  });

  it('answers upstream_unavailable when the data source fails', async () => {
    const { app, source, post } = await setup();
    source.available = false;
    const res = await post('A1B2C3-000000');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'upstream_unavailable' });
    await app.close();
  });

  it('uses X-Forwarded-For only when TRUST_PROXY is set', async () => {
    for (const [trust, expectedSecond] of [
      ['false', 429],
      ['true', 404],
    ] as const) {
      const { app, post } = await setup({ FAILED_LOOKUPS_PER_HOUR: '1', TRUST_PROXY: trust });
      await post('FFFFFF-000001', { 'x-forwarded-for': '203.0.113.1' });
      const second = await post('FFFFFF-000002', { 'x-forwarded-for': '203.0.113.2' });
      expect(second.statusCode).toBe(expectedSecond);
      await app.close();
    }
  });
});

describe('session lifecycle', () => {
  it('returns capabilities for a valid session and forgets a deleted one', async () => {
    const { app, post } = await setup();
    const { sessionId } = (await post('A1B2C3-000000')).json<{ sessionId: string }>();
    const headers = { 'x-session': sessionId };

    const caps = await app.inject({ method: 'GET', url: '/api/v1/capabilities', headers });
    expect(caps.statusCode).toBe(200);
    expect(caps.json()).toEqual(CAPS);

    const del = await app.inject({ method: 'DELETE', url: '/api/v1/session', headers });
    expect(del.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/api/v1/capabilities', headers });
    expect(after.statusCode).toBe(401);
    expect(after.json()).toEqual({ error: 'session_expired' });
    await app.close();
  });

  it('rejects requests without a session', async () => {
    const { app } = await setup();
    const res = await app.inject({ method: 'GET', url: '/api/v1/capabilities' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
