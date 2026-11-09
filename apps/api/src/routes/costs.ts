import {
  formatPlainDate,
  MAX_COST_DAYS,
  parsePlainDate,
  SESSION_HEADER,
  type CostDay,
  type CostDaysResponse,
} from '@p1/shared';
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import type { CapabilityService } from '../data/capabilities';
import type { CostService, DayEntry } from '../costs/service';
import type { SessionStore } from '../sessions';
import { zonedDate, zonedToUtc } from '../time';
import { fail, resolveHousehold, upstream } from './household';

const QuerySchema = z.object({ from: z.string(), to: z.string() });

export interface CostRouteOptions {
  sessions: SessionStore;
  capabilities: CapabilityService;
  costs: CostService;
}

const round = (value: number) => Math.round(value * 10_000) / 10_000;

function toDay({ date, cost }: DayEntry): CostDay {
  if (typeof cost === 'string') return { date, unknown: cost };
  return {
    date,
    totalEur: round(cost.totalEur),
    electricityEur: round(cost.electricityEur),
    gasEur: round(cost.gasEur),
    fixedEur: round(cost.fixedEur),
    taxReductionEur: round(cost.taxReductionEur),
    ...(cost.estimated && { estimated: true }),
  };
}

/** Daily costs per tariff profile (costs phase 3, #42); used to check against a statement. */
export const costRoutes: FastifyPluginCallback<CostRouteOptions> = (app, options, done) => {
  const deps = { sessions: options.sessions, capabilities: options.capabilities, log: app.log };

  app.get('/costs/days', async (request, reply) => {
    const query = QuerySchema.safeParse(request.query);
    const from = query.success ? parsePlainDate(query.data.from) : null;
    const to = query.success ? parsePlainDate(query.data.to) : null;
    const today = formatPlainDate(zonedDate(new Date()));
    const days =
      from && to
        ? Math.round((zonedToUtc(to).getTime() - zonedToUtc(from).getTime()) / 86_400_000) + 1
        : 0;
    if (!from || !to || formatPlainDate(to) > today || days < 1 || days > MAX_COST_DAYS) {
      return fail(reply, 400, 'invalid_format');
    }

    const header = request.headers[SESSION_HEADER];
    const household = await resolveHousehold(
      deps,
      typeof header === 'string' ? header : undefined,
      reply,
    );
    if (!household) return reply;

    const result = await upstream(app.log, reply, () =>
      options.costs.days(household.signature, household.capabilities, from, to),
    );
    if (result === undefined) return reply;
    return {
      own: result.own.map(toDay),
      ...(result.compare && {
        compare: { name: result.compare.name, days: result.compare.days.map(toDay) },
      }),
    } satisfies CostDaysResponse;
  });

  done();
};
