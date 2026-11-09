import type { Capabilities, ErrorResponse } from '@p1/shared';
import type { FastifyBaseLogger, FastifyReply } from 'fastify';
import type { CapabilityService } from '../data/capabilities';
import { UpstreamError } from '../data/source';
import type { SessionStore } from '../sessions';

export const fail = (reply: FastifyReply, status: number, error: ErrorResponse['error']) =>
  reply.code(status).send({ error } satisfies ErrorResponse);

export interface Household {
  signature: string;
  capabilities: Capabilities;
}

/**
 * Resolves the household behind a session ID, or sends the error response and returns
 * undefined: 401 without a valid session, 404 when the household has no data any more,
 * 503 when InfluxDB is unreachable.
 */
export async function resolveHousehold(
  deps: { sessions: SessionStore; capabilities: CapabilityService; log: FastifyBaseLogger },
  sessionId: string | undefined,
  reply: FastifyReply,
): Promise<Household | undefined> {
  const signature = deps.sessions.get(sessionId);
  if (!signature) {
    await fail(reply, 401, 'session_expired');
    return undefined;
  }
  try {
    const capabilities = await deps.capabilities.get(signature);
    if (capabilities) return { signature, capabilities };
    await fail(reply, 404, 'not_found');
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    deps.log.warn({ err: error }, 'capability lookup failed');
    await fail(reply, 503, 'upstream_unavailable');
  }
  return undefined;
}

/** Runs a data call and turns an unreachable InfluxDB into a 503. */
export async function upstream<T>(
  log: FastifyBaseLogger,
  reply: FastifyReply,
  call: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await call();
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    log.warn({ err: error }, 'data query failed');
    await fail(reply, 503, 'upstream_unavailable');
    return undefined;
  }
}
