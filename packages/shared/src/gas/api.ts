/** Request and response shapes of the gas analysis endpoints (design §6). */
import { z } from 'zod';
import {
  DegreeDayMethodSchema,
  MAX_BASE_TEMPERATURE,
  MIN_BASE_TEMPERATURE,
  type DegreeDayMethod,
} from './degreeDays';
import {
  BUILD_PERIODS,
  DWELLING_TYPES,
  FLOOR_AREAS,
  GasProfileSchema,
  HEATINGS,
  RESIDENTS,
} from './profile';
import { STATION_CODES } from './stations';

const StationSchema = z.coerce
  .number()
  .int()
  .refine((code) => STATION_CODES.includes(code));

const flag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const GasAnalysisQuerySchema = z.object({
  station: StationSchema,
  base: z.coerce.number().min(MIN_BASE_TEMPERATURE).max(MAX_BASE_TEMPERATURE).multipleOf(0.5),
  method: DegreeDayMethodSchema,
  /** Manual baseline in m³/day; absent means automatic. */
  baseline: z.coerce.number().min(0).max(20).optional(),
  cooking: flag,
});
/** The query as the web app sends it. */
export interface GasAnalysisQuery {
  station: number;
  base: number;
  method: DegreeDayMethod;
  baseline?: number;
  cooking: 'true' | 'false';
}

export const GasHourlyQuerySchema = z.object({ station: StationSchema });

/** The profile as query parameters (all optional); `solar` is "true"/"false". */
export const GasComparisonQuerySchema = z.object({
  type: z.enum(DWELLING_TYPES).optional(),
  area: z.enum(FLOOR_AREAS).optional(),
  period: z.enum(BUILD_PERIODS).optional(),
  residents: z.enum(RESIDENTS).optional(),
  solar: flag.optional(),
  heating: z.enum(HEATINGS).optional(),
});

const GasPeriodSchema = z.object({
  start: z.string(),
  key: z.string(),
  days: z.number(),
  m3: z.number(),
  dd: z.number(),
  perDd: z.number().nullable(),
});
export type GasPeriodResponse = z.infer<typeof GasPeriodSchema>;

export const GasAnalysisSchema = z.object({
  station: z.number(),
  /** Weather data is still being fetched for this station; ask again shortly. */
  pending: z.boolean(),
  /** Last day with weather (YYYY-MM-DD), or null. */
  weatherUntil: z.string().nullable(),
  days: z.array(
    z.object({
      day: z.string(),
      m3: z.number().nullable(),
      t: z.number().nullable(),
      dd: z.number().nullable(),
    }),
  ),
  baseline: z.object({
    value: z.number(),
    auto: z.number().nullable(),
    source: z.enum(['auto', 'line', 'manual', 'off']),
  }),
  line: z
    .object({ slope: z.number(), intercept: z.number(), r2: z.number(), n: z.number() })
    .nullable(),
  periods: z.object({
    week: z.array(GasPeriodSchema),
    month: z.array(GasPeriodSchema),
    year: z.array(GasPeriodSchema),
  }),
  years: z.array(
    z.object({
      year: z.number(),
      days: z.number(),
      m3: z.number(),
      dd: z.number(),
      corrected: z.number().nullable(),
      complete: z.boolean(),
    }),
  ),
  forecast: z
    .object({ year: z.number(), actual: z.number(), estimated: z.number(), total: z.number() })
    .nullable(),
  normal: z.object({ annual: z.number(), years: z.number() }),
});
export type GasAnalysis = z.infer<typeof GasAnalysisSchema>;

export const GasHourlySchema = z.object({
  pending: z.boolean(),
  /** Analysed range (YYYY-MM-DD, inclusive). */
  from: z.string(),
  to: z.string(),
  /** The meter reports gas once an hour; hours were shifted back by one (§3.6). */
  hourlyUpdates: z.boolean(),
  curve: z.array(z.object({ t: z.number(), m3: z.number(), n: z.number() })),
  profiles: z.object({
    cold: z.array(z.number().nullable()).nullable(),
    mild: z.array(z.number().nullable()).nullable(),
  }),
});
export type GasHourly = z.infer<typeof GasHourlySchema>;

const DistributionSchema = z.object({
  n: z.number(),
  /** The household's percentile (rounded to 5); null without its own reference value. */
  percentile: z.number().nullable(),
  p10: z.number(),
  p25: z.number(),
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
});
export type Distribution = z.infer<typeof DistributionSchema>;

const CbsFiguresSchema = z.object({
  mean: z.number(),
  p10: z.number(),
  p20: z.number(),
  p30: z.number(),
  p40: z.number(),
  p50: z.number(),
  p60: z.number(),
  p70: z.number(),
  p80: z.number(),
  p90: z.number(),
});
export type CbsFigures = z.infer<typeof CbsFiguresSchema>;

export const GasComparisonSchema = z.object({
  /** Weather-corrected consumption of the last 365 days (reference method, §4.1). */
  own: z.number().nullable(),
  /** Whether this household currently shares its profile. */
  shared: z.boolean(),
  all: DistributionSchema.nullable(),
  /** The narrowest shared-profile group with at least 5 households. */
  group: DistributionSchema.extend({ profile: GasProfileSchema }).nullable(),
  cbs: z
    .object({
      year: z.number(),
      /** The (possibly broadened) profile CBS publishes figures for. */
      profile: GasProfileSchema,
      perDwelling: CbsFiguresSchema,
      /** m³ per m² of floor area; absent when CBS has none for this row. */
      perM2: CbsFiguresSchema.nullable(),
      /** CBS median per year for the same profile, for the Years card. */
      medians: z.array(z.object({ year: z.number(), p50: z.number() })),
    })
    .nullable(),
});
export type GasComparison = z.infer<typeof GasComparisonSchema>;
