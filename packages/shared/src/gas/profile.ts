/**
 * Dwelling profile with the classes of CBS StatLine 85140NED, and the comparison helpers
 * (docs/design/2026-11-15-gas-analysis.md §4).
 */
import { z } from 'zod';

export const DWELLING_TYPES = [
  'apartment',
  'terraced',
  'endTerrace',
  'semiDetached',
  'detached',
] as const;
export const FLOOR_AREAS = ['lt50', '50to75', '75to100', '100to150', '150to250', 'gte250'] as const;
export const BUILD_PERIODS = [
  'lt1946',
  '1946to1964',
  '1965to1974',
  '1975to1991',
  '1992to2005',
  '2006to2014',
  'gte2015',
] as const;
export const RESIDENTS = ['1', '2', '3', '4', '5plus'] as const;
export const HEATINGS = ['boiler', 'hybrid'] as const;

/** Every field is optional: unknown fields count as CBS "Total". */
export const GasProfileSchema = z.object({
  type: z.enum(DWELLING_TYPES).optional(),
  area: z.enum(FLOOR_AREAS).optional(),
  period: z.enum(BUILD_PERIODS).optional(),
  residents: z.enum(RESIDENTS).optional(),
  solar: z.boolean().optional(),
  heating: z.enum(HEATINGS).optional(),
});
export type GasProfile = z.infer<typeof GasProfileSchema>;
export type GasProfileField = keyof GasProfile;

export const CBS_TABLE = '85140NED';

/** CBS codes per class; `total` is used for an unknown field. */
export const CBS_CODES = {
  type: {
    total: 'T001100',
    apartment: 'ZW25810',
    terraced: 'ZW25805',
    endTerrace: 'ZW25806',
    semiDetached: 'ZW10300',
    detached: 'ZW10320',
  },
  area: {
    total: 'T001116',
    lt50: 'A050300',
    '50to75': 'A025408',
    '75to100': 'A025409',
    '100to150': 'A025410',
    '150to250': 'A025411',
    gte250: 'A050301',
  },
  period: {
    total: 'T001018',
    lt1946: 'ZW25799',
    '1946to1964': 'ZW25800',
    '1965to1974': 'ZW10406',
    '1975to1991': 'ZW25801',
    '1992to2005': 'ZW25815',
    '2006to2014': 'ZW25818',
    gte2015: 'ZW25797',
  },
  residents: {
    total: 'T001351',
    '1': 'A043072',
    '2': 'A043073',
    '3': 'A043074',
    '4': 'A043075',
    '5plus': 'A043076',
  },
  /** Gas-heated dwellings (individual boiler or block heating), by solar panels. */
  heating: { total: 'A050299', solar: 'A052167', noSolar: 'A052168' },
} as const;

/** CBS dimension codes of one table row. */
export interface CbsKey {
  type: string;
  area: string;
  period: string;
  residents: string;
  heating: string;
}

export function cbsKey(profile: GasProfile): CbsKey {
  return {
    type: CBS_CODES.type[profile.type ?? 'total'],
    area: CBS_CODES.area[profile.area ?? 'total'],
    period: CBS_CODES.period[profile.period ?? 'total'],
    residents: CBS_CODES.residents[profile.residents ?? 'total'],
    heating:
      profile.solar === undefined
        ? CBS_CODES.heating.total
        : profile.solar
          ? CBS_CODES.heating.solar
          : CBS_CODES.heating.noSolar,
  };
}

/** Floor area used for the household's own m³ per m²; "250+" counts as 300 m². */
export const AREA_M2: Record<(typeof FLOOR_AREAS)[number], number> = {
  lt50: 40,
  '50to75': 62.5,
  '75to100': 87.5,
  '100to150': 125,
  '150to250': 200,
  gte250: 300,
};

/** Fields dropped one by one when a group is too small (§4.3). */
export const GROUP_FALLBACK: readonly GasProfileField[] = [
  'solar',
  'residents',
  'period',
  'area',
  'heating',
  'type',
];

/** The profile and its broader groups, narrowest first; never the empty profile. */
export function groupCandidates(profile: GasProfile): GasProfile[] {
  const result: GasProfile[] = [];
  let current: GasProfile = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => v !== undefined),
  );
  for (const field of [undefined, ...GROUP_FALLBACK]) {
    if (field) {
      if (current[field] === undefined) continue;
      current = { ...current };
      delete current[field];
    }
    if (Object.keys(current).length > 0) result.push(current);
  }
  return result;
}

export function matchesGroup(profile: GasProfile, group: GasProfile): boolean {
  return (Object.keys(group) as GasProfileField[]).every((f) => profile[f] === group[f]);
}

/** Smallest group shown (§2). */
export const MIN_GROUP_SIZE = 5;

/** Linear-interpolated quantile of sorted values. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Share (%) of values below `own`, counting equal values half. */
export function percentileRank(values: number[], own: number): number {
  let below = 0;
  for (const v of values) below += v < own ? 1 : v === own ? 0.5 : 0;
  return (below / values.length) * 100;
}
