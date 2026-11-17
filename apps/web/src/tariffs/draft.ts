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
  /** Dynamic: the import markup is earned back on export while net metering applies (#88). */
  refundMarkupOnExport: boolean;
  /** Legacy markup from before #88 that could not be converted; empty when there is none. */
  dynamicMarkupPerKwh: string;
  gasType: 'none' | 'fixed' | 'dynamic';
  perM3: string;
  markupPerM3: string;
  energyTaxPerM3: string;
  gasVatPercent: string;
  supplierPerMonth: string;
  /** Grid costs per `gridUnit`. */
  grid: string;
  gridUnit: 'day' | 'month';
  /** Fixed amounts excl. VAT, as on the invoice. */
  fixedExclVat: boolean;
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
  refundMarkupOnExport: false,
  dynamicMarkupPerKwh: '',
  gasType: withGas ? 'fixed' : 'none',
  perM3: '',
  markupPerM3: '',
  energyTaxPerM3: '',
  gasVatPercent: '21',
  supplierPerMonth: '',
  grid: '',
  gridUnit: 'month',
  fixedExclVat: false,
  taxReductionPerYear: '',
});

/** "0,30" or "0.30" → 0.3; empty or invalid → NaN (rejected by the schema). */
export function parseAmount(value: string): number {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  return trimmed === '' || !/^-?\d*\.?\d+$/.test(trimmed) ? Number.NaN : Number(trimmed);
}

const show = (value: number | undefined) =>
  value === undefined ? '' : String(value).replace('.', ',');

/** Avoids float noise such as 0.030000000000000002 when adding amounts. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * The export of a period as the form edits it. A legacy `dynamicMarkupPerKwh` (before #88) is
 * converted where its meaning is clear (docs/design/2026-11-17-tariff-fields.md §5).
 */
function exportFields(period: TariffPeriod) {
  const e = period.electricity;
  const { feePerKwh, refundMarkupOnExport, dynamicMarkupPerKwh: legacy } = period.export;
  const converted = { fee: feePerKwh, refund: refundMarkupOnExport ?? false, legacy: undefined };
  if (legacy === undefined || legacy === 0 || e.type !== 'dynamic') return converted;
  if (legacy === e.markupPerKwh) return { ...converted, refund: true };
  if (legacy < 0) return { ...converted, fee: round(feePerKwh - legacy) };
  return { ...converted, legacy };
}

export function toDraft(period: TariffPeriod): PeriodDraft {
  const e = period.electricity;
  const g = period.gas;
  const exported = exportFields(period);
  const f = period.fixed;
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
    feePerKwh: show(exported.fee),
    refundMarkupOnExport: exported.refund,
    dynamicMarkupPerKwh: show(exported.legacy),
    gasType: g ? g.type : 'none',
    perM3: g?.type === 'fixed' ? show(g.perM3) : '',
    markupPerM3: g?.type === 'dynamic' ? show(g.markupPerM3) : '',
    energyTaxPerM3: g?.type === 'dynamic' ? show(g.energyTaxPerM3) : '',
    gasVatPercent: g?.type === 'dynamic' ? show(g.vatPercent) : '21',
    supplierPerMonth: show(f.supplierPerMonth),
    grid: show(f.gridPerDay ?? f.gridPerMonth),
    gridUnit: f.gridPerDay === undefined ? 'month' : 'day',
    fixedExclVat: f.exclVat ?? false,
    taxReductionPerYear: show(period.taxReductionPerYear),
  };
}

export type DraftField = keyof PeriodDraft;
/** Fields typed as amounts (everything except the date, the choices and the switches). */
export type AmountField = Exclude<
  DraftField,
  | 'validFrom'
  | 'name'
  | 'electricityType'
  | 'gasType'
  | 'gridUnit'
  | 'refundMarkupOnExport'
  | 'fixedExclVat'
  | 'dynamicMarkupPerKwh'
>;

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
  const dynamic = draft.electricityType === 'dynamic';
  // Hidden for dynamic contracts; keep a valid typed value, so switching back does not lose it.
  const compensation = n(draft.compensationPerKwh);
  const candidate = {
    validFrom: draft.validFrom,
    ...(draft.name.trim() !== '' && { name: draft.name.trim() }),
    electricity,
    export: {
      compensationPerKwh: dynamic && !(compensation >= 0) ? 0 : compensation,
      feePerKwh: n(draft.feePerKwh),
      ...(dynamic && draft.refundMarkupOnExport && { refundMarkupOnExport: true }),
      ...(dynamic &&
        draft.dynamicMarkupPerKwh.trim() !== '' && {
          dynamicMarkupPerKwh: n(draft.dynamicMarkupPerKwh),
        }),
    },
    ...(gas && { gas }),
    fixed: {
      supplierPerMonth: n(draft.supplierPerMonth),
      ...(draft.gridUnit === 'day'
        ? { gridPerDay: n(draft.grid) }
        : { gridPerMonth: n(draft.grid) }),
      ...(draft.fixedExclVat && { exclVat: true }),
    },
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
    } else if (group === 'fixed' && key) {
      fields.add(key === 'gridPerMonth' || key === 'gridPerDay' ? 'grid' : (key as DraftField));
    } else if (group === 'taxReductionPerYear') fields.add('taxReductionPerYear');
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
