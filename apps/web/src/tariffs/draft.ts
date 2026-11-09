import { TariffPeriodSchema, type TariffPeriod } from '@p1/shared';

/**
 * Form state of one tariff period: amounts as typed (Dutch decimal comma allowed), converted
 * and validated with the shared schema when saving.
 */
export interface PeriodDraft {
  validFrom: string;
  name: string;
  electricityType: 'single' | 'double' | 'dynamic';
  perKwh: string;
  normalPerKwh: string;
  offPeakPerKwh: string;
  markupPerKwh: string;
  energyTaxPerKwh: string;
  vatPercent: string;
  compensationPerKwh: string;
  feePerKwh: string;
  dynamicMarkupPerKwh: string;
  gasType: 'none' | 'fixed' | 'dynamic';
  perM3: string;
  markupPerM3: string;
  energyTaxPerM3: string;
  gasVatPercent: string;
  supplierPerMonth: string;
  gridPerMonth: string;
  taxReductionPerYear: string;
}

export const emptyDraft = (validFrom: string, withGas: boolean): PeriodDraft => ({
  validFrom,
  name: '',
  electricityType: 'single',
  perKwh: '',
  normalPerKwh: '',
  offPeakPerKwh: '',
  markupPerKwh: '',
  energyTaxPerKwh: '',
  vatPercent: '21',
  compensationPerKwh: '0',
  feePerKwh: '0',
  dynamicMarkupPerKwh: '',
  gasType: withGas ? 'fixed' : 'none',
  perM3: '',
  markupPerM3: '',
  energyTaxPerM3: '',
  gasVatPercent: '21',
  supplierPerMonth: '',
  gridPerMonth: '',
  taxReductionPerYear: '',
});

/** "0,30" or "0.30" → 0.3; empty or invalid → NaN (rejected by the schema). */
export function parseAmount(value: string): number {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  return trimmed === '' || !/^-?\d*\.?\d+$/.test(trimmed) ? Number.NaN : Number(trimmed);
}

const show = (value: number | undefined) =>
  value === undefined ? '' : String(value).replace('.', ',');

export function toDraft(period: TariffPeriod): PeriodDraft {
  const e = period.electricity;
  const g = period.gas;
  return {
    validFrom: period.validFrom,
    name: period.name ?? '',
    electricityType: e.type,
    perKwh: e.type === 'single' ? show(e.perKwh) : '',
    normalPerKwh: e.type === 'double' ? show(e.normalPerKwh) : '',
    offPeakPerKwh: e.type === 'double' ? show(e.offPeakPerKwh) : '',
    markupPerKwh: e.type === 'dynamic' ? show(e.markupPerKwh) : '',
    energyTaxPerKwh: e.type === 'dynamic' ? show(e.energyTaxPerKwh) : '',
    vatPercent: e.type === 'dynamic' ? show(e.vatPercent) : '21',
    compensationPerKwh: show(period.export.compensationPerKwh),
    feePerKwh: show(period.export.feePerKwh),
    dynamicMarkupPerKwh: show(period.export.dynamicMarkupPerKwh),
    gasType: g ? g.type : 'none',
    perM3: g?.type === 'fixed' ? show(g.perM3) : '',
    markupPerM3: g?.type === 'dynamic' ? show(g.markupPerM3) : '',
    energyTaxPerM3: g?.type === 'dynamic' ? show(g.energyTaxPerM3) : '',
    gasVatPercent: g?.type === 'dynamic' ? show(g.vatPercent) : '21',
    supplierPerMonth: show(period.fixed.supplierPerMonth),
    gridPerMonth: show(period.fixed.gridPerMonth),
    taxReductionPerYear: show(period.taxReductionPerYear),
  };
}

export type DraftField = keyof PeriodDraft;
/** Fields typed as amounts (everything except the date and the type choices). */
export type AmountField = Exclude<DraftField, 'validFrom' | 'name' | 'electricityType' | 'gasType'>;

/** Converts and validates; returns the period or the fields that are wrong. */
export function fromDraft(
  draft: PeriodDraft,
): { ok: true; period: TariffPeriod } | { ok: false; fields: DraftField[] } {
  const n = parseAmount;
  const electricity =
    draft.electricityType === 'single'
      ? { type: 'single' as const, perKwh: n(draft.perKwh) }
      : draft.electricityType === 'double'
        ? {
            type: 'double' as const,
            normalPerKwh: n(draft.normalPerKwh),
            offPeakPerKwh: n(draft.offPeakPerKwh),
          }
        : {
            type: 'dynamic' as const,
            markupPerKwh: n(draft.markupPerKwh),
            energyTaxPerKwh: n(draft.energyTaxPerKwh),
            vatPercent: n(draft.vatPercent),
          };
  const gas =
    draft.gasType === 'fixed'
      ? { type: 'fixed' as const, perM3: n(draft.perM3) }
      : draft.gasType === 'dynamic'
        ? {
            type: 'dynamic' as const,
            markupPerM3: n(draft.markupPerM3),
            energyTaxPerM3: n(draft.energyTaxPerM3),
            vatPercent: n(draft.gasVatPercent),
          }
        : undefined;
  const candidate = {
    validFrom: draft.validFrom,
    ...(draft.name.trim() !== '' && { name: draft.name.trim() }),
    electricity,
    export: {
      compensationPerKwh: n(draft.compensationPerKwh),
      feePerKwh: n(draft.feePerKwh),
      ...(draft.electricityType === 'dynamic' && draft.dynamicMarkupPerKwh.trim() !== ''
        ? { dynamicMarkupPerKwh: n(draft.dynamicMarkupPerKwh) }
        : {}),
    },
    ...(gas && { gas }),
    fixed: { supplierPerMonth: n(draft.supplierPerMonth), gridPerMonth: n(draft.gridPerMonth) },
    taxReductionPerYear: n(draft.taxReductionPerYear),
  };

  const parsed = TariffPeriodSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, period: parsed.data };

  // Map schema paths back to form fields.
  const fields = new Set<DraftField>();
  for (const issue of parsed.error.issues) {
    const [group, key] = issue.path.map(String);
    if (group === 'validFrom') fields.add('validFrom');
    else if (group === 'name') fields.add('name');
    else if (group === 'electricity' && key) fields.add(key as DraftField);
    else if (group === 'export' && key) fields.add(key as DraftField);
    else if (group === 'gas' && key) {
      fields.add((key === 'vatPercent' ? 'gasVatPercent' : key) as DraftField);
    } else if (group === 'fixed' && key) fields.add(key as DraftField);
    else if (group === 'taxReductionPerYear') fields.add('taxReductionPerYear');
  }
  return { ok: false, fields: [...fields] };
}

/** Short Dutch summary for the list, e.g. "Vast · € 0,30/kWh". */
export function summary(period: TariffPeriod): string {
  const euro = (v: number) =>
    `€ ${v
      .toFixed(4)
      .replace(/0{1,2}$/, '')
      .replace('.', ',')}`;
  const e = period.electricity;
  if (e.type === 'single') return `Enkel tarief · ${euro(e.perKwh)}/kWh`;
  if (e.type === 'double')
    return `Dubbel tarief · ${euro(e.normalPerKwh)} / ${euro(e.offPeakPerKwh)}`;
  return `Dynamisch · opslag ${euro(e.markupPerKwh)}/kWh`;
}
