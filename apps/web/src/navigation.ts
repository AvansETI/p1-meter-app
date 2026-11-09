import { barChartOutline, flashOutline, settingsOutline } from 'ionicons/icons';

/** Top-level destinations, shared by the mobile tab bar and the desktop side menu. */
export const NAV_ITEMS = [
  { tab: 'live', path: '/live', labelKey: 'nav.live', icon: flashOutline },
  { tab: 'history', path: '/history', labelKey: 'nav.history', icon: barChartOutline },
  { tab: 'settings', path: '/settings', labelKey: 'nav.settings', icon: settingsOutline },
] as const;
