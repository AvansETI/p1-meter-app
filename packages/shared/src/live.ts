import { z } from 'zod';

/**
 * A point younger than this counts as live. Kits send irregularly (often every 10–20 s, but
 * regularly with 2–2.5 minute pauses); 5 minutes shows "no recent data" only ~0.1 % of the
 * time for working meters, against ~20 % with 60 s (measured 2026-11-09, 93 households).
 */
export const LIVE_MAX_AGE_SEC = 300;
/** Without data for this long the meter is considered offline. */
export const OFFLINE_AFTER_SEC = 3600;

export const LiveStatusSchema = z.enum(['live', 'stale', 'offline']);
export type LiveStatus = z.infer<typeof LiveStatusSchema>;

export function liveStatus(ageSec: number): LiveStatus {
  if (ageSec < LIVE_MAX_AGE_SEC) return 'live';
  if (ageSec < OFFLINE_AFTER_SEC) return 'stale';
  return 'offline';
}

/**
 * Net power from the grid's point of view: positive = import, negative = export.
 * Import and export can both be > 0 at once on three-phase connections.
 */
export function netKw(importKw: number, exportKw: number): number {
  return Math.round((importKw - exportKw) * 1000) / 1000;
}

export const LiveSnapshotSchema = z.object({
  /** ISO timestamp of the latest point. */
  time: z.string(),
  /** Age of that point when the API sent it. */
  ageSec: z.number(),
  status: LiveStatusSchema,
  importKw: z.number(),
  exportKw: z.number(),
  netKw: z.number(),
});
export type LiveSnapshot = z.infer<typeof LiveSnapshotSchema>;

export const TodayTotalsSchema = z.object({
  /** ISO timestamp of local midnight (Europe/Amsterdam). */
  since: z.string(),
  importKwh: z.number(),
  /** Only for households with export. */
  exportKwh: z.number().optional(),
  netKwh: z.number().optional(),
  /** Only for households with gas. */
  gasM3: z.number().optional(),
});
export type TodayTotals = z.infer<typeof TodayTotalsSchema>;

export const RecentSeriesSchema = z.object({
  stepSec: z.number(),
  points: z.array(z.object({ t: z.string(), netKw: z.number().nullable() })),
});
export type RecentSeries = z.infer<typeof RecentSeriesSchema>;
