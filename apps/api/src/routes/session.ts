import {
  SESSION_HEADER,
  SessionRequestSchema,
  normalizeEmonId,
  type Capabilities,
  type SessionResponse,
} from '@p1/shared';
import type { FastifyPluginCallback, FastifyReply } from 'fastify';
import type { CapabilityService } from '../data/capabilities';
import { UpstreamError } from '../data/source';
import type { AttemptCounter, SessionStore } from '../sessions';
import { fail, resolveHousehold } from './household';

export interface SessionRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  failedLookups: AttemptCounter;
  dailyAttempts: AttemptCounter;
  limits: { perMinute: number; perDay: number; failedPerHour: number };
}

const sessionId = (header: string | string[] | undefined) =>
  typeof header === 'string' ? header : undefined;

export const sessionRoutes: FastifyPluginCallback<SessionRouteOptions> = (app, options, done) => {
  const { sessions, capabilities, failedLookups, dailyAttempts, limits } = options;

  /** Wraps detection so an unreachable InfluxDB becomes a 503 instead of a 500. */
  async function lookup(signature: string, reply: FastifyReply) {
    try {
      return { capabilities: await capabilities.get(signature) };
    } catch (error) {
      if (!(error instanceof UpstreamError)) throw error;
      app.log.warn({ err: error }, 'capability lookup failed');
      return { reply: fail(reply, 503, 'upstream_unavailable') };
    }
  }

  app.post(
    '/session',
    { config: { rateLimit: { max: limits.perMinute, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const ip = request.ip;
      if (failedLookups.count(ip) >= limits.failedPerHour) {
        reply.header('retry-after', failedLookups.retryAfterSec(ip));
        return fail(reply, 429, 'rate_limited');
      }
      if (dailyAttempts.add(ip) > limits.perDay) {
        reply.header('retry-after', dailyAttempts.retryAfterSec(ip));
        return fail(reply, 429, 'rate_limited');
      }

      const body = SessionRequestSchema.safeParse(request.body);
      const normalized = body.success ? normalizeEmonId(body.data.emonId) : { ok: false as const };
      if (!normalized.ok) return fail(reply, 400, 'invalid_format');

      // Unknown and inactive IDs take the same path and get the same answer.
      const result = await lookup(normalized.signature, reply);
      if (result.reply) return result.reply;
      if (!result.capabilities) {
        if (failedLookups.add(ip) >= limits.failedPerHour) failedLookups.restartWindow(ip);
        return fail(reply, 404, 'not_found');
      }

      return {
        sessionId: sessions.create(normalized.signature),
        signature: normalized.signature,
        capabilities: result.capabilities,
      } satisfies SessionResponse;
    },
  );

  app.get('/capabilities', async (request, reply) => {
    const deps = { sessions, capabilities, log: app.log };
    const household = await resolveHousehold(
      deps,
      sessionId(request.headers[SESSION_HEADER]),
      reply,
    );
    return household ? (household.capabilities satisfies Capabilities) : reply;
  });

  app.delete('/session', (request, reply) => {
    sessions.delete(sessionId(request.headers[SESSION_HEADER]));
    void reply.code(204).send();
  });

  done();
};
