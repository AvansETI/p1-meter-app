import type { Capabilities, TariffPeriod } from '@p1/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { FakeDataSource } from '../data/fake';
import { buildServer } from '../server';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const CAPS: Capabilities = {
  hasGas: false,
  hasExport: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
};
const period: TariffPeriod = {
  validFrom: '2026-01-01',
  electricity: { type: 'single', perKwh: 0.3 },
  export: { compensationPerKwh: 0, feePerKwh: 0 },
  fixed: { supplierPerMonth: 31, gridPerMonth: 0 },
  taxReductionPerYear: 0,
};

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup() {
  const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), {
    source: new FakeDataSource({ [SIG]: CAPS }),
  });
  apps.push(app);
  const { sessionId } = (
    await app.inject({
      method: 'POST',
      url: '/api/v1/session',
      payload: { emonId: 'A1B2C3-000000' },
    })
  ).json<{ sessionId: string }>();
  const headers = { 'x-session': sessionId };
  const get = (url: string) => app.inject({ method: 'GET', url: `/api/v1${url}`, headers });
  return { app, get, headers };
}

describe('GET /costs/days', () => {
  it('validates the range', async () => {
    const { get } = await setup();
    for (const query of [
      '',
      '?from=2026-01-05&to=2026-01-01',
      '?from=2024-01-01&to=2025-06-01',
      '?from=2999-01-01&to=2999-01-02',
      '?from=2026-02-30&to=2026-03-01',
    ]) {
      expect((await get(`/costs/days${query}`)).statusCode, query).toBe(400);
    }
  });

  it('requires a session', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/costs/days?from=2026-01-01&to=2026-01-01',
    });
    expect(res.statusCode).toBe(401);
  });

  it('reports unknown days with the reason', async () => {
    const { app, get, headers } = await setup();
    expect((await get('/costs/days?from=2026-01-01&to=2026-01-02')).json()).toEqual({
      own: [
        { date: '2026-01-01', unknown: 'no-tariff' },
        { date: '2026-01-02', unknown: 'no-tariff' },
      ],
    });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/tariffs',
      payload: { profiles: { own: { periods: [period] } } },
      headers: { ...headers, 'if-match': '0' },
    });
    // The fake household has no counter data.
    expect((await get('/costs/days?from=2026-01-01&to=2026-01-01')).json()).toEqual({
      own: [{ date: '2026-01-01', unknown: 'no-usage' }],
    });
  });
});
