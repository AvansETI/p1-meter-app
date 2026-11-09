import { z } from 'zod';

/** Why a day has no cost (docs/design/2026-11-09-costs.md §6). */
export const CostUnknownSchema = z.enum(['no-tariff', 'no-price', 'no-usage']);

/** Costs of one local day in euros; `unknown` instead of amounts when they cannot be computed. */
export const CostDaySchema = z.object({
  date: z.string(),
  totalEur: z.number().optional(),
  electricityEur: z.number().optional(),
  gasEur: z.number().optional(),
  fixedEur: z.number().optional(),
  taxReductionEur: z.number().optional(),
  /** Usage includes values spread over a gap of more than an hour. */
  estimated: z.boolean().optional(),
  unknown: CostUnknownSchema.optional(),
});
export type CostDay = z.infer<typeof CostDaySchema>;

export const CostDaysResponseSchema = z.object({
  own: z.array(CostDaySchema),
  compare: z.object({ name: z.string(), days: z.array(CostDaySchema) }).optional(),
});
export type CostDaysResponse = z.infer<typeof CostDaysResponseSchema>;

/** Longest range of GET /costs/days. */
export const MAX_COST_DAYS = 366;

/** Costs of a day or part of it for one contract, or why they are unknown. */
export const ProfileCostSchema = z.union([
  z.object({
    totalEur: z.number(),
    electricityEur: z.number(),
    gasEur: z.number(),
    fixedEur: z.number(),
    taxReductionEur: z.number(),
    estimated: z.boolean(),
  }),
  z.object({ unknown: CostUnknownSchema }),
]);
export type ProfileCost = z.infer<typeof ProfileCostSchema>;

/** GET /costs/today: costs so far today (fixed costs pro rata), docs/design/2026-11-09-costs.md §7.1. */
export const CostsTodaySchema = z.object({
  /** False when no contract has a tariff period: the app then shows no costs. */
  configured: z.boolean(),
  own: ProfileCostSchema.optional(),
  compare: z.object({ name: z.string(), cost: ProfileCostSchema }).optional(),
});
export type CostsToday = z.infer<typeof CostsTodaySchema>;

/** Costs per contract in euros; null when unknown. */
const ProfileAmounts = z.object({
  own: z.number().nullable(),
  compare: z.number().nullable().optional(),
});

export const CostTotalsSchema = ProfileAmounts.extend({
  /** False when some (past) buckets are unknown; the totals are then a lower bound. */
  complete: z.boolean(),
});
export type CostTotals = z.infer<typeof CostTotalsSchema>;

export const ForecastBasisSchema = z.enum(['last-year', 'last-30-days', 'mixed']);
export type ForecastBasis = z.infer<typeof ForecastBasisSchema>;

/** Costs added to a history response when the household has tariffs (§7.1). */
export const HistoryCostsSchema = z.object({
  compareName: z.string().optional(),
  buckets: z.array(ProfileAmounts.extend({ estimated: z.literal(true).optional() })),
  totals: CostTotalsSchema,
  /** The comparable part of the previous period; null when unknown. */
  previous: CostTotalsSchema.nullable(),
  /** Expected costs of the whole current month or year. */
  forecast: ProfileAmounts.extend({ basis: ForecastBasisSchema }).optional(),
});
export type HistoryCosts = z.infer<typeof HistoryCostsSchema>;
