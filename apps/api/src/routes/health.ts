import type { FastifyPluginCallback } from 'fastify';
import type { HealthResponse } from '@p1/shared';
import pkg from '../../package.json' with { type: 'json' };
import type { HouseholdDataSource } from '../data/source';

const PING_CACHE_MS = 30_000;

export const healthRoutes: FastifyPluginCallback<{ source: HouseholdDataSource }> = (
  app,
  { source },
  done,
) => {
  let lastPing: { ok: boolean; at: number } | undefined;

  app.get('/health', async (): Promise<HealthResponse> => {
    if (!lastPing || Date.now() - lastPing.at > PING_CACHE_MS) {
      lastPing = { ok: await source.ping(), at: Date.now() };
    }
    return {
      status: 'ok',
      version: pkg.version,
      uptimeSec: Math.round(process.uptime()),
      influx: lastPing.ok ? 'ok' : 'unavailable',
    };
  });
  done();
};
