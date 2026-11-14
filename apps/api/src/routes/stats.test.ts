import type { Capabilities, StatsResponse } from '@p1/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../config';
import { FakeDataSource } from '../data/fake';
import { UpstreamError } from '../data/source';
import { buildServer } from '../server';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const OTHER = '2019-ETI-EMON-V01-A1B2C3-000001';
const CAPS: Capabilities = {
  hasGas: false,
  hasExport: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
};

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const source = new FakeDataSource({ [SIG]: CAPS, [OTHER]: CAPS });
  const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), { source });
  const stats = async () =>
    (await app.inject({ method: 'GET', url: '/api/v1/stats' })).json<StatsResponse>();
  const open = (emonId: string) =>
    app.inject({ method: 'POST', url: '/api/v1/session', payload: { emonId } });
  return { app, source, stats, open };
}

describe('GET /api/v1/stats', () => {
  it('needs no session and starts at zero users', async () => {
    const { app, stats } = await setup();
    expect(await stats()).toMatchObject({ days: 30, activeUsers: 0, activeInstallations: 2 });
    await app.close();
  });

  it('counts households that opened a session, and only known ones', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
    const { app, stats, open } = await setup();
    await open(SIG);
    await open(SIG);
    expect((await open('2019-ETI-EMON-V01-FFFFFF-000000')).statusCode).toBe(404);
    expect(await stats()).toEqual({
      days: 30,
      activeUsers: 1,
      activeInstallations: 2,
      usersSince: '2026-11-14',
    });
    await app.close();
  });

  it('counts households that use an existing session', async () => {
    const { app, stats, open } = await setup();
    const { sessionId } = (await open(SIG)).json<{ sessionId: string }>();
    await app.inject({
      method: 'GET',
      url: '/api/v1/capabilities',
      headers: { 'x-session': sessionId },
    });
    expect((await stats()).activeUsers).toBe(1);
    await app.close();
  });

  it('leaves out the installations when InfluxDB fails', async () => {
    const { app, source, stats } = await setup();
    vi.spyOn(source, 'activeSignatureCount').mockRejectedValue(new UpstreamError('down'));
    const body = await stats();
    expect(body.activeUsers).toBe(0);
    expect(body).not.toHaveProperty('activeInstallations');
    await app.close();
  });
});
