/** Holiday decoration in the title bar (docs/design/2026-11-14-festive-decoration.md). */
export type Season = 'christmas' | 'newyear';

const SEASONS: readonly Season[] = ['christmas', 'newyear'];

/** The season for a local date, or null outside the holidays. */
export function seasonAt(date: Date): Season | null {
  const month = date.getMonth(); // 0 = January
  const day = date.getDate();
  if (month === 11 && day >= 22 && day <= 30) return 'christmas';
  if ((month === 11 && day === 31) || (month === 0 && day <= 2)) return 'newyear';
  return null;
}

/** `?festive=` from the URL: a season, 'off', or undefined when absent or invalid. */
export function seasonOverride(search: string): Season | 'off' | undefined {
  const value = new URLSearchParams(search).get('festive');
  if (value === 'off') return 'off';
  return SEASONS.find((season) => season === value);
}

/** The decoration to show: a preview override wins over the setting and the date. */
export function activeSeason({
  override,
  enabled,
  now,
}: {
  override: Season | 'off' | undefined;
  enabled: boolean;
  now: Date;
}): Season | null {
  if (override === 'off') return null;
  if (override) return override;
  return enabled ? seasonAt(now) : null;
}
