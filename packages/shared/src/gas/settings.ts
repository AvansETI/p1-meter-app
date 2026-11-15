/**
 * Gas analysis settings shared by every device of a household
 * (docs/design/2026-11-15-shared-gas-settings.md §4). Strict: the server stores only valid
 * settings; the browser reads its local copy leniently.
 */
import { z } from 'zod';
import { DegreeDayMethodSchema, MAX_BASE_TEMPERATURE, MIN_BASE_TEMPERATURE } from './degreeDays';
import { GasProfileSchema } from './profile';
import { MonthDaySchema, YearDivisionSchema } from './years';

export const GasSharedSettingsSchema = z
  .object({
    /** 2-digit postcode region, to pick the nearest KNMI station. */
    postcode: z
      .string()
      .regex(/^[1-9]\d$/)
      .optional(),
    /** Station picked by hand; wins over the postcode. */
    station: z.number().int().optional(),
    base: z.number().min(MIN_BASE_TEMPERATURE).max(MAX_BASE_TEMPERATURE),
    method: DegreeDayMethodSchema,
    /** Cooking and/or hot water on gas: a baseline is subtracted from the heating gas. */
    cooking: z.boolean(),
    /** Manual baseline in m³/day; absent means automatic. */
    baseline: z.number().min(0).max(20).optional(),
    /** Year division: calendar years, contract years or heating seasons. */
    years: YearDivisionSchema,
    /** Contract start "MM-DD"; absent means the date from the tariffs. */
    contractStart: MonthDaySchema.optional(),
    /** Expected annual use in m³ from the contract, for the settlement forecast. */
    expected: z.number().min(1).max(20000).optional(),
    profile: GasProfileSchema.strict(),
    /** Share the profile to compare with similar households. */
    share: z.boolean(),
  })
  .strict();
export type GasSharedSettings = z.infer<typeof GasSharedSettingsSchema>;

export const GasSettingsResponseSchema = z.object({
  /** Null when no device of the household has saved settings yet. */
  settings: GasSharedSettingsSchema.nullable(),
  updatedAt: z.string().nullable(),
});
export type GasSettingsResponse = z.infer<typeof GasSettingsResponseSchema>;

export const GasSettingsBodySchema = z.object({ settings: GasSharedSettingsSchema }).strict();

export const GasSettingsSavedSchema = z.object({ updatedAt: z.string() });
export type GasSettingsSaved = z.infer<typeof GasSettingsSavedSchema>;
