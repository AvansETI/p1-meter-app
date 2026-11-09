import {
  SESSION_HEADER,
  type GasSeries,
  type LiveSnapshot,
  type RecentSeries,
  type TodayTotals,
} from '@p1/shared';
import type { FastifyPluginCallback } from 'fastify';
import type { CapabilityService } from '../data/capabilities';
import type { LivePoller } from '../live/poller';
import type { LiveService } from '../live/service';
import type { SessionStore } from '../sessions';
import { fail, resolveHousehold, upstream } from './household';

export interface LiveRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  live: LiveService;
  poller: LivePoller;
  maxStreamsPerSession?: number;
  heartbeatMs?: number;
}

const headerSession = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined;

export const liveRoutes: FastifyPluginCallback<LiveRouteOptions> = (app, options, done) => {
  const { sessions, capabilities, live, poller } = options;
  const maxStreams = options.maxStreamsPerSession ?? 2;
  const heartbeatMs = options.heartbeatMs ?? 25_000;
  const deps = { sessions, capabilities, log: app.log };
  const openStreams = new Map<string, number>();

  app.get('/live', async (request, reply) => {
    const household = await resolveHousehold(
      deps,
      headerSession(request.headers[SESSION_HEADER]),
      reply,
    );
    if (!household) return reply;
    const snapshot = await upstream(app.log, reply, () => live.snapshot(household.signature));
    if (snapshot === undefined) return reply;
    if (snapshot === null) return fail(reply, 404, 'not_found');
    return snapshot satisfies LiveSnapshot;
  });

  app.get('/live/today', async (request, reply) => {
    const household = await resolveHousehold(
      deps,
      headerSession(request.headers[SESSION_HEADER]),
      reply,
    );
    if (!household) return reply;
    const totals = await upstream(app.log, reply, () =>
      live.todayTotals(household.signature, household.capabilities),
    );
    return totals === undefined ? reply : (totals satisfies TodayTotals);
  });

  app.get('/live/recent', async (request, reply) => {
    const household = await resolveHousehold(
      deps,
      headerSession(request.headers[SESSION_HEADER]),
      reply,
    );
    if (!household) return reply;
    const series = await upstream(app.log, reply, () => live.recentSeries(household.signature));
    return series === undefined ? reply : (series satisfies RecentSeries);
  });

  app.get('/live/gas', async (request, reply) => {
    const household = await resolveHousehold(
      deps,
      headerSession(request.headers[SESSION_HEADER]),
      reply,
    );
    if (!household) return reply;
    if (!household.capabilities.hasGas) return fail(reply, 404, 'not_found');
    const series = await upstream(app.log, reply, () => live.gasSeries(household.signature));
    return series === undefined ? reply : (series satisfies GasSeries);
  });

  // EventSource cannot send headers, so the session comes as query parameter here.
  app.get<{ Querystring: { session?: string } }>('/live/stream', async (request, reply) => {
    const sessionId = request.query.session;
    const household = await resolveHousehold(deps, sessionId, reply);
    if (!household || !sessionId) return reply;
    if ((openStreams.get(sessionId) ?? 0) >= maxStreams) return fail(reply, 429, 'rate_limited');
    openStreams.set(sessionId, (openStreams.get(sessionId) ?? 0) + 1);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');

    const unsubscribe = poller.subscribe(household.signature, (snapshot) => {
      res.write(`event: live\ndata: ${JSON.stringify(snapshot)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(': ping\n\n'), heartbeatMs);

    request.raw.once('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      const remaining = (openStreams.get(sessionId) ?? 1) - 1;
      if (remaining > 0) openStreams.set(sessionId, remaining);
      else openStreams.delete(sessionId);
    });
  });

  done();
};
