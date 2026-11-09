import {
  formatPlainDate,
  parsePlainDate,
  PeriodSchema,
  SESSION_HEADER,
  type History,
} from '@p1/shared';
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import type { CapabilityService } from '../data/capabilities';
import type { CostViews } from '../costs/views';
import type { HistoryService } from '../history/service';
import type { SessionStore } from '../sessions';
import { zonedDate } from '../time';
import { fail, resolveHousehold, upstream } from './household';

const QuerySchema = z.object({ period: PeriodSchema, date: z.string() });

export interface HistoryRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  history: HistoryService;
  /** Adds costs when the household has tariffs (costs phase 4, #49). */
  costs?: CostViews;
}

export const historyRoutes: FastifyPluginCallback<HistoryRouteOptions> = (app, options, done) => {
  const deps = { sessions: options.sessions, capabilities: options.capabilities, log: app.log };

  app.get('/history', async (request, reply) => {
    const query = QuerySchema.safeParse(request.query);
    const date = query.success ? parsePlainDate(query.data.date) : null;
    // Plain dates compare correctly as strings; the future has no data.
    const today = formatPlainDate(zonedDate(new Date()));
    if (!query.success || !date || formatPlainDate(date) > today) {
      return fail(reply, 400, 'invalid_format');
    }

    const header = request.headers[SESSION_HEADER];
    const household = await resolveHousehold(
      deps,
      typeof header === 'string' ? header : undefined,
      reply,
    );
    if (!household) return reply;

    const result = await upstream(app.log, reply, async () => {
      const { signature, capabilities } = household;
      const [history, costs] = await Promise.all([
        options.history.history(signature, capabilities, query.data.period, date),
        options.costs?.history(signature, capabilities, query.data.period, date),
      ]);
      return costs ? { ...history, costs } : history;
    });
    return result === undefined ? reply : (result satisfies History);
  });

  done();
};
