/**
 * Minimum time the splash screen stays visible, measured from navigation start.
 * Keep in sync with the loading-bar animation in index.html.
 */
export const SPLASH_MIN_MS = 3500;

/** After an update reload the splash stays at least this long, with "Bijwerken…" (#73). */
export const SPLASH_UPDATED_MS = 2000;

/** A splash that waits for a found update gives up after this long (a failed install). */
export const UPDATE_HOLD_MAX_MS = 15_000;
const HOLD_POLL_MS = 250;

/** Upper bound for the fade-out, in case `transitionend` never fires. */
const FADE_FALLBACK_MS = 400;

export interface HideSplashOptions {
  minMs?: number;
  /** True while a found update is being installed; the splash then waits for the reload. */
  updating?: () => boolean;
  now?: () => number;
  reducedMotion?: () => boolean;
}

/**
 * Fades out and removes the inline splash from index.html once the minimum duration has passed.
 * The minimum runs from navigation start, so on slow loads the splash adds no extra delay.
 * While a found update installs, the splash stays (the page reloads into a new splash).
 */
export function hideSplash(
  el: HTMLElement | null = document.getElementById('splash'),
  {
    // After an update reload the splash already showed most of its time (see index.html).
    minMs = document.documentElement.dataset.splash === 'updated'
      ? SPLASH_UPDATED_MS
      : SPLASH_MIN_MS,
    updating = () => document.documentElement.dataset.splash === 'updating',
    now = () => performance.now(),
    reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }: HideSplashOptions = {},
): Promise<void> {
  if (!el) return Promise.resolve();
  const wait = Math.max(0, minMs - now());

  return new Promise((resolve) => {
    let held = 0;
    const fade = () => {
      // An update was found: keep "Bijwerken…" in view until the page reloads.
      if (updating() && held < UPDATE_HOLD_MAX_MS) {
        held += HOLD_POLL_MS;
        setTimeout(fade, HOLD_POLL_MS);
        return;
      }
      const remove = () => {
        el.remove();
        resolve();
      };
      if (reducedMotion()) {
        remove();
        return;
      }
      el.addEventListener('transitionend', remove, { once: true });
      el.classList.add('splash--hide');
      setTimeout(remove, FADE_FALLBACK_MS);
    };
    setTimeout(fade, wait);
  });
}
