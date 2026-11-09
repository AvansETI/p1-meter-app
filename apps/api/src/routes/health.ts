import type { FastifyPluginCallback } from 'fastify';
import type { HealthResponse } from '@p1/shared';
import pkg from '../../package.json' with { type: 'json' };
import type { HouseholdDataSource } from '../data/source';

const PING_INTERVAL_MS = 30_000;

/**
 * Liveness plus the last known InfluxDB status. Never waits for InfluxDB: the deploy health
 * check must get an answer within seconds even when InfluxDB is unreachable (#17).
 */
export const healthRoutes: FastifyPluginCallback<{
  source: HouseholdDataSource;
  prices?: () => NonNullable<HealthResponse['prices']>;
}> = (app, { source, prices }, done) => {
  let influx: NonNullable<HealthResponse['influx']> = 'unknown';
  let lastPingAt = 0;
  let pinging = false;

  const refresh = () => {
    if (pinging || Date.now() - lastPingAt < PING_INTERVAL_MS) return;
    pinging = true;
    source
      .ping()
      .then((ok) => (influx = ok ? 'ok' : 'unavailable'))
      .catch(() => (influx = 'unavailable'))
      .finally(() => {
        pinging = false;
        lastPingAt = Date.now();
      });
  };

  app.get('/health', (): HealthResponse => {
    refresh();
    return {
      status: 'ok',
      version: pkg.version,
      uptimeSec: Math.round(process.uptime()),
      influx,
      ...(prices && { prices: prices() }),
    };
  });
  done();
};
