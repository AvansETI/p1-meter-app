import type { GasProfile } from '@p1/shared';
import type { TFunction } from 'i18next';

/** "Tussenwoning, 100–150 m², 1975–1991" for the fields that are filled in. */
export function profileSummary(profile: GasProfile, t: TFunction): string {
  return [
    profile.type && t(`gas.type.${profile.type}`),
    profile.area && t(`gas.area.${profile.area}`),
    profile.period && t(`gas.period.${profile.period}`),
    profile.residents && t(`gas.residents.${profile.residents}`),
    profile.solar !== undefined && t(profile.solar ? 'gas.solarYes' : 'gas.solarNo'),
    profile.heating && t(`gas.heating.${profile.heating}`),
  ]
    .filter(Boolean)
    .join(', ');
}
