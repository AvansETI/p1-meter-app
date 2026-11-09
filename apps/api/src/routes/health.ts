import type { FastifyPluginCallback } from 'fastify';
import type { HealthResponse } from '@p1/shared';
import pkg from '../../package.json' with { type: 'json' };

export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/health', (): HealthResponse => ({
    status: 'ok',
    version: pkg.version,
    uptimeSec: Math.round(process.uptime()),
  }));
  done();
};
