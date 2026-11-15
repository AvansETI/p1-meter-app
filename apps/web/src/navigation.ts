import { barChartOutline, flameOutline, flashOutline, settingsOutline } from 'ionicons/icons';

/** Top-level destinations, shared by the mobile tab bar and the desktop side menu. */
export const NAV_ITEMS = [
  { tab: 'live', path: '/live', labelKey: 'nav.live', icon: flashOutline },
  { tab: 'history', path: '/history', labelKey: 'nav.history', icon: barChartOutline },
  // Only for households with gas (docs/design/2026-11-15-gas-analysis.md §7.3).
  { tab: 'gas', path: '/gas', labelKey: 'nav.gas', icon: flameOutline, gasOnly: true },
  { tab: 'settings', path: '/settings', labelKey: 'nav.settings', icon: settingsOutline },
] as const;

/** The destinations this household can use. */
export function navItems(hasGas: boolean) {
  return NAV_ITEMS.filter((item) => !('gasOnly' in item) || hasGas);
}
