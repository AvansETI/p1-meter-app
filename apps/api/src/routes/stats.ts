import type { StatsResponse } from '@p1/shared';
import type { FastifyPluginCallback } from 'fastify';
import type { HouseholdDataSource } from '../data/source';
import { UpstreamError } from '../data/source';
import { dayKey, type UsageTracker } from '../usage/tracker';

export const STATS_DAYS = 30;
const INSTALLATIONS_TTL_MS = 60 * 60_000;
const USERS_TTL_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Active users and active meter kits over the last 30 days (#63). Public: the numbers are
 * aggregates and reveal no household.
 */
export const statsRoutes: FastifyPluginCallback<{
  source: HouseholdDataSource;
  usage: UsageTracker;
}> = (app, { source, usage }, done) => {
  let installations: { value: number; at: number } | undefined;
  let users: { value: number; at: number } | undefined;

  async function activeInstallations(): Promise<number | undefined> {
    if (installations && Date.now() - installations.at < INSTALLATIONS_TTL_MS) {
      return installations.value;
    }
    try {
      installations = { value: await source.activeSignatureCount(STATS_DAYS), at: Date.now() };
      return installations.value;
    } catch (error) {
      if (!(error instanceof UpstreamError)) throw error;
      app.log.warn({ err: error }, 'active installation count failed');
      return installations?.value;
    }
  }

  app.get('/stats', async (): Promise<StatsResponse> => {
    const now = new Date();
    if (!users || Date.now() - users.at >= USERS_TTL_MS) {
      users = { value: usage.activeUsers(STATS_DAYS, now), at: Date.now() };
    }
    const since = usage.since();
    // Counting started less than 30 days ago: say since when.
    const counting =
      since === null || since > dayKey(new Date(now.getTime() - (STATS_DAYS - 1) * DAY_MS));
    const kits = await activeInstallations();
    return {
      days: STATS_DAYS,
      activeUsers: users.value,
      ...(kits !== undefined && { activeInstallations: kits }),
      ...(counting && { usersSince: since ?? dayKey(now) }),
    };
  });

  done();
};
