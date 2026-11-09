import {
  SESSION_HEADER,
  TariffProfilesSchema,
  type TariffVersion,
  type TariffsResponse,
} from '@p1/shared';
import type { FastifyPluginCallback, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { CapabilityService } from '../data/capabilities';
import { VersionConflictError, type TariffRepository } from '../db/tariffs';
import type { AttemptCounter, SessionStore } from '../sessions';
import { fail, resolveHousehold } from './household';

export interface TariffRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  tariffs: TariffRepository;
  /** Saves per household per hour. */
  writes: AttemptCounter;
  writesPerHour: number;
}

/** Every change in the Settings screen is a save, so allow a comfortable editing session. */
export const TARIFF_WRITES_PER_HOUR = 30;

const BodySchema = z.object({ profiles: TariffProfilesSchema });
const toResponse = (stored: ReturnType<TariffRepository['get']>): TariffsResponse => stored;

/** Tariff profiles per household (docs/design/2026-11-09-costs.md §6.1). */
export const tariffRoutes: FastifyPluginCallback<TariffRouteOptions> = (app, options, done) => {
  const { tariffs, writes, writesPerHour } = options;
  const deps = { sessions: options.sessions, capabilities: options.capabilities, log: app.log };
  const household = (request: FastifyRequest, reply: Parameters<typeof fail>[0]) => {
    const header = request.headers[SESSION_HEADER];
    return resolveHousehold(deps, typeof header === 'string' ? header : undefined, reply);
  };

  app.get('/tariffs', async (request, reply) => {
    const h = await household(request, reply);
    if (!h) return reply;
    return toResponse(tariffs.get(h.signature));
  });

  app.put('/tariffs', async (request, reply) => {
    const h = await household(request, reply);
    if (!h) return reply;
    const body = BodySchema.safeParse(request.body);
    const expected = Number(request.headers['if-match']);
    if (!body.success || !Number.isInteger(expected)) return fail(reply, 400, 'invalid_format');
    if (writes.add(h.signature) > writesPerHour) {
      reply.header('retry-after', writes.retryAfterSec(h.signature));
      return fail(reply, 429, 'rate_limited');
    }
    try {
      const saved = tariffs.save(h.signature, body.data.profiles, expected);
      app.log.info({ signature: h.signature, version: saved.version }, 'tariffs saved');
      return toResponse(saved);
    } catch (error) {
      if (error instanceof VersionConflictError) return fail(reply, 409, 'conflict');
      throw error;
    }
  });

  app.get('/tariffs/versions', async (request, reply) => {
    const h = await household(request, reply);
    if (!h) return reply;
    return tariffs.versions(h.signature) satisfies TariffVersion[];
  });

  app.post<{ Params: { version: string } }>(
    '/tariffs/versions/:version/restore',
    async (request, reply) => {
      const h = await household(request, reply);
      if (!h) return reply;
      const version = Number(request.params.version);
      if (!Number.isInteger(version)) return fail(reply, 400, 'invalid_format');
      if (writes.add(h.signature) > writesPerHour) return fail(reply, 429, 'rate_limited');
      const restored = tariffs.restore(h.signature, version);
      if (!restored) return fail(reply, 404, 'not_found');
      app.log.info(
        { signature: h.signature, from: version, version: restored.version },
        'tariffs restored',
      );
      return toResponse(restored);
    },
  );

  done();
};
