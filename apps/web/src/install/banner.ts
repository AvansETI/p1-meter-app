import type { LiveStatus } from '@p1/shared';
import type { InstallMethod } from './platform';
import { OFFERABLE } from './useInstall';

/** A dismissed banner comes back after this long. */
export const BANNER_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** Whether the Live page shows the install banner (docs/design/2026-11-09-install-hints.md §4). */
export function shouldShowBanner({
  method,
  liveStatus,
  dismissedAt,
  now = Date.now(),
}: {
  method: InstallMethod;
  liveStatus: LiveStatus | undefined;
  dismissedAt: string | undefined;
  now?: number;
}): boolean {
  if (!OFFERABLE.has(method)) return false;
  // The offline notice has priority.
  if (liveStatus === 'offline') return false;
  if (dismissedAt && now - Date.parse(dismissedAt) < BANNER_SNOOZE_MS) return false;
  return true;
}
