import { useEffect, useRef } from 'react';
import { isBusy } from './busy';
import { onNewServerVersion } from './serverVersion';

const CHECK_INTERVAL_MS = 60 * 60_000;
const MIN_CHECK_GAP_MS = 60_000;
const BUSY_RETRY_MS = 5_000;

/** The version before an automatic reload, for the "updated" message (sessionStorage). */
export const UPDATED_FROM_KEY = 'p1meter.updatedFrom';

/**
 * Looks for a new service worker when the app comes back to the foreground, every hour and
 * when the API reports another version (#64). An installed app on iOS resumes from memory
 * without a page load, so the browser's own check would not run. Lives as long as the app;
 * returns a stop function for tests.
 */
export function startUpdateChecks(registration: { update: () => Promise<unknown> }) {
  let lastCheck = Date.now();
  const check = () => {
    if (document.hidden || Date.now() - lastCheck < MIN_CHECK_GAP_MS) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Offline or the server is restarting: try again at the next occasion.
    });
  };
  const timer = setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', check);
  // Every API response tells the server version; at most one check per minute follows.
  const stopListening = onNewServerVersion(check);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
    stopListening();
  };
}

/**
 * Activates a waiting new version and reloads, as soon as the user is not busy (§4): right
 * away, or within seconds after closing an overlay or leaving a text field.
 */
export function useReloadWhenIdle(
  needRefresh: boolean,
  updateServiceWorker: (reloadPage: boolean) => Promise<void>,
  version: string = __APP_VERSION__,
) {
  const reloading = useRef(false);

  useEffect(() => {
    if (!needRefresh) return;
    const tryReload = () => {
      if (reloading.current || isBusy()) return;
      reloading.current = true;
      try {
        sessionStorage.setItem(UPDATED_FROM_KEY, version);
      } catch {
        // Without storage the update still happens, only the message is skipped.
      }
      // A splash that is still showing says "Bijwerken…" and continues after the reload.
      document.documentElement.dataset.splash = 'updating';
      void updateServiceWorker(true);
    };
    tryReload();
    const timer = setInterval(tryReload, BUSY_RETRY_MS);
    document.addEventListener('visibilitychange', tryReload);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tryReload);
    };
  }, [needRefresh, updateServiceWorker, version]);
}
