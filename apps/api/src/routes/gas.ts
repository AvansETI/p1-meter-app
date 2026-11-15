import {
  GasAnalysisQuerySchema,
  GasComparisonQuerySchema,
  GasHourlyQuerySchema,
  GasProfileSchema,
  SESSION_HEADER,
  type GasAnalysis,
  type GasComparison,
  type GasHourly,
} from '@p1/shared';
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import type { CapabilityService } from '../data/capabilities';
import type { GasService } from '../gas/service';
import type { SessionStore } from '../sessions';
import { fail, resolveHousehold, upstream } from './household';

export interface GasRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  gas: GasService;
}

/** Gas analysis, comparison and profile sharing (docs/design/2026-11-15-gas-analysis.md §6). */
export const gasRoutes: FastifyPluginCallback<GasRouteOptions> = (app, options, done) => {
  const deps = { sessions: options.sessions, capabilities: options.capabilities, log: app.log };

  /** The household behind the session, only when it has gas; otherwise the error is sent. */
  async function household(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers[SESSION_HEADER];
    const found = await resolveHousehold(
      deps,
      typeof header === 'string' ? header : undefined,
      reply,
    );
    if (found && !found.capabilities.hasGas) {
      await fail(reply, 404, 'not_found');
      return undefined;
    }
    return found;
  }

  app.get('/gas/analysis', async (request, reply) => {
    const query = GasAnalysisQuerySchema.safeParse(request.query);
    if (!query.success) return fail(reply, 400, 'invalid_format');
    const found = await household(request, reply);
    if (!found) return reply;
    const result = await upstream(app.log, reply, () =>
      options.gas.analysis(found.signature, query.data),
    );
    return result === undefined ? reply : (result satisfies GasAnalysis);
  });

  app.get('/gas/hourly', async (request, reply) => {
    const query = GasHourlyQuerySchema.safeParse(request.query);
    if (!query.success) return fail(reply, 400, 'invalid_format');
    const found = await household(request, reply);
    if (!found) return reply;
    const result = await upstream(app.log, reply, () =>
      options.gas.hourly(found.signature, query.data.station),
    );
    return result === undefined ? reply : (result satisfies GasHourly);
  });

  app.get('/gas/comparison', async (request, reply) => {
    const query = GasComparisonQuerySchema.safeParse(request.query);
    if (!query.success) return fail(reply, 400, 'invalid_format');
    const found = await household(request, reply);
    if (!found) return reply;
    const result = await upstream(app.log, reply, () =>
      options.gas.comparison(found.signature, query.data),
    );
    return result === undefined ? reply : (result satisfies GasComparison);
  });

  app.put('/gas/profile', async (request, reply) => {
    const body = GasProfileSchema.strict().safeParse(request.body);
    if (!body.success) return fail(reply, 400, 'invalid_format');
    const found = await household(request, reply);
    if (!found) return reply;
    options.gas.shareProfile(found.signature, body.data);
    return reply.code(204).send();
  });

  app.delete('/gas/profile', async (request, reply) => {
    const found = await household(request, reply);
    if (!found) return reply;
    options.gas.unshareProfile(found.signature);
    return reply.code(204).send();
  });

  done();
};
