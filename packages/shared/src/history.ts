import { z } from 'zod';
import { PERIODS } from './calendar';

export const PeriodSchema = z.enum(PERIODS);

export const TotalsSchema = z.object({
  importKwh: z.number().nullable(),
  exportKwh: z.number().nullable().optional(),
  netKwh: z.number().nullable().optional(),
  gasM3: z.number().nullable().optional(),
  /** False when data is missing in (part of) the period; the totals are then a lower bound. */
  complete: z.boolean(),
});
export type Totals = z.infer<typeof TotalsSchema>;

export const HistoryBucketSchema = z.object({
  start: z.string(),
  importKwh: z.number().nullable(),
  exportKwh: z.number().nullable().optional(),
  netKwh: z.number().nullable().optional(),
  gasM3: z.number().nullable().optional(),
  /** The values include use during an earlier gap, not broken down. */
  spansGap: z.literal(true).optional(),
  gapStart: z.string().optional(),
});
export type HistoryBucket = z.infer<typeof HistoryBucketSchema>;

export const HistorySchema = z.object({
  period: PeriodSchema,
  /** ISO, local period boundaries (Europe/Amsterdam). */
  start: z.string(),
  end: z.string(),
  /** Date (YYYY-MM-DD) of the household's first data point; navigation stops there. */
  firstData: z.string(),
  buckets: z.array(HistoryBucketSchema),
  totals: TotalsSchema,
  /** The comparable part of the previous period; null when unknown. */
  previous: TotalsSchema.nullable(),
});
export type History = z.infer<typeof HistorySchema>;
