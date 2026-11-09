import { z } from 'zod';

/** Amounts in euros. "Incl." = including energy tax and VAT, as on a Dutch annual statement. */
const euro = z.number().finite().min(0).max(1000);
const markup = z.number().finite().min(-10).max(10);
const vat = z.number().finite().min(0).max(100);
const planDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ElectricityTariffSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('single'), perKwh: euro }),
  z.object({ type: z.literal('double'), normalPerKwh: euro, offPeakPerKwh: euro }),
  z.object({
    type: z.literal('dynamic'),
    /** Supplier markup per kWh, excl. VAT (may be negative). */
    markupPerKwh: markup,
    energyTaxPerKwh: euro,
    vatPercent: vat,
  }),
]);

export const ExportTariffSchema = z.object({
  /** Feed-in compensation per kWh (excess under net metering; all export from 2027). */
  compensationPerKwh: euro,
  /** Feed-in costs per kWh charged by the supplier (from 2027). */
  feePerKwh: euro,
  /** Dynamic contracts: export earns the day-ahead price plus this (may be negative). */
  dynamicMarkupPerKwh: markup.optional(),
});

export const GasTariffSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('fixed'), perM3: euro }),
  z.object({
    type: z.literal('dynamic'),
    markupPerM3: markup,
    energyTaxPerM3: euro,
    vatPercent: vat,
  }),
]);

export const TariffPeriodSchema = z.object({
  validFrom: planDate,
  electricity: ElectricityTariffSchema,
  export: ExportTariffSchema,
  gas: GasTariffSchema.optional(),
  fixed: z.object({ supplierPerMonth: euro, gridPerMonth: euro }),
  taxReductionPerYear: euro,
});
export type TariffPeriod = z.infer<typeof TariffPeriodSchema>;

const periods = z
  .array(TariffPeriodSchema)
  .max(50)
  .refine((list) => new Set(list.map((p) => p.validFrom)).size === list.length, {
    message: 'validFrom must be unique',
  })
  .transform((list) => [...list].sort((a, b) => a.validFrom.localeCompare(b.validFrom)));

export const TariffProfilesSchema = z.object({
  own: z.object({ periods }),
  compare: z.object({ name: z.string().trim().min(1).max(40), periods }).optional(),
});
export type TariffProfiles = z.infer<typeof TariffProfilesSchema>;

export const TariffsResponseSchema = z.object({
  profiles: TariffProfilesSchema,
  /** Increases with every save; send it back in If-Match to avoid overwriting newer changes. */
  version: z.number().int().min(0),
  updatedAt: z.string().nullable(),
});
export type TariffsResponse = z.infer<typeof TariffsResponseSchema>;

export const TariffVersionSchema = z.object({
  version: z.number().int(),
  createdAt: z.string(),
  ownPeriods: z.number().int(),
  comparePeriods: z.number().int().nullable(),
  compareName: z.string().nullable(),
});
export type TariffVersion = z.infer<typeof TariffVersionSchema>;

/** The tariff period that applies on a date (YYYY-MM-DD), or undefined before the first one. */
export function periodOn(list: TariffPeriod[], date: string): TariffPeriod | undefined {
  let found: TariffPeriod | undefined;
  for (const period of list) if (period.validFrom <= date) found = period;
  return found;
}
