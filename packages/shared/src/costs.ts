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
