/** CBS StatLine 85140NED: gas use of dwellings (docs/design/2026-11-15-gas-analysis.md §4.4). */
import { CBS_CODES, CBS_TABLE, type CbsFigures, type CbsKey } from '@p1/shared';

const BASE = `https://opendata.cbs.nl/ODataApi/odata/${CBS_TABLE}`;

export interface CbsRow extends CbsKey {
  year: number;
  perDwelling: CbsFigures;
  perM2: CbsFigures | null;
}

const PERCENTILES = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;

/** Column names in the order mean, P10 … P90 (the suffixes are CBS column numbers). */
const DWELLING_COLUMNS = [
  'GemiddeldeAardgasleveringTempGecorr_3',
  ...PERCENTILES.map((p, i) => `AardgasTempGecorrPercentiel${p}_${i + 4}`),
];
const M2_COLUMNS = [
  'GemiddeldeAardgasTempGecPerOpp_13',
  ...PERCENTILES.map((p, i) => `AardgasTempGecPerWoonoppPerc${p}_${i + 14}`),
];
const KEY_COLUMNS = [
  'Perioden',
  'Woningtype',
  'Gebruiksoppervlakte',
  'Bouwjaar',
  'Bewonersklasse',
  'HoofdverwarmingEnZonnestroom',
];

export const CBS_HEATING_CODES = Object.values(CBS_CODES.heating);

export const cbsPeriodsUrl = () => `${BASE}/Perioden`;

/** One year and one heating class: about 4,000 rows, below the 10,000-row limit (no paging). */
export function cbsRowsUrl(year: number, heating: string): string {
  const params = new URLSearchParams({
    $filter: `Perioden eq '${year}JJ00' and HoofdverwarmingEnZonnestroom eq '${heating}'`,
    $select: [...KEY_COLUMNS, ...DWELLING_COLUMNS, ...M2_COLUMNS].join(','),
  });
  return `${BASE}/TypedDataSet?${params.toString()}`;
}

/** Years in the table, e.g. [2019, …, 2025]. */
export function parseCbsPeriods(json: unknown): number[] {
  const value = (json as { value?: Array<{ Key?: unknown }> }).value;
  if (!Array.isArray(value)) throw new Error('unexpected CBS response');
  return value.flatMap((p) => {
    const match = typeof p.Key === 'string' ? /^(\d{4})JJ00$/.exec(p.Key) : null;
    return match ? [Number(match[1])] : [];
  });
}

function figures(row: Record<string, unknown>, columns: string[]): CbsFigures | null {
  const values = columns.map((c) => row[c]);
  if (values.some((v) => typeof v !== 'number')) return null;
  const [mean, ...p] = values as number[];
  return {
    mean: mean!,
    p10: p[0]!,
    p20: p[1]!,
    p30: p[2]!,
    p40: p[3]!,
    p50: p[4]!,
    p60: p[5]!,
    p70: p[6]!,
    p80: p[7]!,
    p90: p[8]!,
  };
}

/** Rows with published figures; suppressed (empty) cells are skipped. */
export function parseCbsRows(json: unknown): CbsRow[] {
  const value = (json as { value?: Array<Record<string, unknown>> }).value;
  if (!Array.isArray(value)) throw new Error('unexpected CBS response');
  return value.flatMap((row) => {
    const perDwelling = figures(row, DWELLING_COLUMNS);
    const year = /^(\d{4})/.exec(String(row.Perioden))?.[1];
    if (!perDwelling || !year) return [];
    return [
      {
        year: Number(year),
        type: String(row.Woningtype),
        area: String(row.Gebruiksoppervlakte),
        period: String(row.Bouwjaar),
        residents: String(row.Bewonersklasse),
        heating: String(row.HoofdverwarmingEnZonnestroom),
        perDwelling,
        perM2: figures(row, M2_COLUMNS),
      },
    ];
  });
}
