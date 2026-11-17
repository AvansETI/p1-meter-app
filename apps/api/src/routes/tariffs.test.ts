import type { Capabilities, TariffPeriod } from '@p1/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import { FakeDataSource } from '../data/fake';
import { buildServer } from '../server';
import { TARIFF_WRITES_PER_HOUR } from './tariffs';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const CAPS: Capabilities = {
  hasGas: true,
  hasExport: true,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
};
const period = (validFrom: string): TariffPeriod => ({
  validFrom,
  electricity: { type: 'single', perKwh: 0.3 },
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  fixed: { supplierPerMonth: 7, gridPerMonth: 40 },
  taxReductionPerYear: 630,
});

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
  const call = (
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    url: string,
    payload?: unknown,
    version?: number,
  ) =>
    app.inject({
      method,
      url: `/api/v1${url}`,
      payload: payload as object | undefined,
      headers: {
        'x-session': sessionId,
        ...(version !== undefined && { 'if-match': String(version) }),
      },
    });
  return { app, call };
}

describe('tariff routes', () => {
  it('start empty, save with the current version and reject stale saves', async () => {
    const { call } = await setup();
    expect((await call('GET', '/tariffs')).json()).toMatchObject({ version: 0, updatedAt: null });

    const saved = await call(
      'PUT',
      '/tariffs',
      { profiles: { own: { periods: [period('2026-01-01')] } } },
      0,
    );
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ version: 1 });

    const stale = await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, 0);
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toEqual({ error: 'conflict' });
  });

  it('rejects invalid tariffs and a missing If-Match', async () => {
    const { call } = await setup();
    const bad = {
      profiles: { own: { periods: [{ ...period('2026-01-01'), taxReductionPerYear: -5 }] } },
    };
    expect((await call('PUT', '/tariffs', bad, 0)).statusCode).toBe(400);
    expect((await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } })).statusCode).toBe(
      400,
    );
  });

  it('lists versions and restores one', async () => {
    const { call } = await setup();
    await call('PUT', '/tariffs', { profiles: { own: { periods: [period('2026-01-01')] } } }, 0);
    await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, 1);
    const versions = (await call('GET', '/tariffs/versions')).json<Array<{ version: number }>>();
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    const restored = await call('POST', '/tariffs/versions/1/restore');
    expect(restored.json()).toMatchObject({ version: 3 });
    expect((await call('GET', '/tariffs')).json()).toMatchObject({
      profiles: { own: { periods: [{ validFrom: '2026-01-01' }] } },
    });
    expect((await call('POST', '/tariffs/versions/99/restore')).statusCode).toBe(404);
  });

  describe('deleting a version (#91)', () => {
    const saveThree = async (call: Awaited<ReturnType<typeof setup>>['call']) => {
      for (const [v, date] of [
        [0, '2025-01-01'],
        [1, '2026-01-01'],
        [2, '2026-06-01'],
      ] as const) {
        await call('PUT', '/tariffs', { profiles: { own: { periods: [period(date)] } } }, v);
      }
    };
    const listed = async (call: Awaited<ReturnType<typeof setup>>['call']) =>
      (await call('GET', '/tariffs/versions'))
        .json<Array<{ version: number }>>()
        .map((v) => v.version);

    it('deletes an earlier version without changing the tariffs in use', async () => {
      const { call } = await setup();
      await saveThree(call);
      const deleted = await call('DELETE', '/tariffs/versions/2', undefined, 3);
      expect(deleted.json()).toMatchObject({
        version: 3,
        profiles: { own: { periods: [{ validFrom: '2026-06-01' }] } },
      });
      expect(await listed(call)).toEqual([3, 1]);
    });

    it('makes the previous version current and never reuses a number', async () => {
      const { call } = await setup();
      await saveThree(call);
      await call('DELETE', '/tariffs/versions/2', undefined, 3);
      const deleted = await call('DELETE', '/tariffs/versions/3', undefined, 3);
      expect(deleted.json()).toMatchObject({
        version: 1,
        profiles: { own: { periods: [{ validFrom: '2025-01-01' }] } },
      });
      expect((await call('GET', '/tariffs')).json()).toMatchObject({ version: 1 });
      expect(await listed(call)).toEqual([1]);
      const saved = await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, 1);
      expect(saved.json()).toMatchObject({ version: 4 });
    });

    it('refuses the only version, a stale version and an unknown one', async () => {
      const { call } = await setup();
      await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, 0);
      expect((await call('DELETE', '/tariffs/versions/1', undefined, 1)).statusCode).toBe(409);
      expect((await call('DELETE', '/tariffs/versions/1', undefined, 0)).statusCode).toBe(409);
      expect((await call('DELETE', '/tariffs/versions/9', undefined, 1)).statusCode).toBe(404);
      expect((await call('DELETE', '/tariffs/versions/1')).statusCode).toBe(400);
      expect(await listed(call)).toEqual([1]);
    });

    it('counts as a tariff write', async () => {
      const { call } = await setup();
      for (let v = 0; v < TARIFF_WRITES_PER_HOUR; v++) {
        await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, v);
      }
      const response = await call(
        'DELETE',
        '/tariffs/versions/1',
        undefined,
        TARIFF_WRITES_PER_HOUR,
      );
      expect(response.statusCode).toBe(429);
    });
  });

  it('limits saves per household per hour', async () => {
    const { call } = await setup();
    let status = 0;
    for (let v = 0; v <= TARIFF_WRITES_PER_HOUR; v++) {
      status = (await call('PUT', '/tariffs', { profiles: { own: { periods: [] } } }, v))
        .statusCode;
    }
    expect(status).toBe(429);
  });

  it('requires a session', async () => {
    const { app } = await setup();
    expect((await app.inject({ method: 'GET', url: '/api/v1/tariffs' })).statusCode).toBe(401);
  });
});
