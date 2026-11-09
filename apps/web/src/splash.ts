/**
 * Minimum time the splash screen stays visible, measured from navigation start.
 * Keep in sync with the loading-bar animation in index.html.
 */
export const SPLASH_MIN_MS = 5000;

/** Upper bound for the fade-out, in case `transitionend` never fires. */
const FADE_FALLBACK_MS = 400;

export interface HideSplashOptions {
  minMs?: number;
  now?: () => number;
  reducedMotion?: () => boolean;
}

/**
 * Fades out and removes the inline splash from index.html once the minimum duration has passed.
 * The minimum runs from navigation start, so on slow loads the splash adds no extra delay.
 */
export function hideSplash(
  el: HTMLElement | null = document.getElementById('splash'),
  {
    minMs = SPLASH_MIN_MS,
    now = () => performance.now(),
    reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }: HideSplashOptions = {},
): Promise<void> {
  if (!el) return Promise.resolve();
  const wait = Math.max(0, minMs - now());

  return new Promise((resolve) => {
    setTimeout(() => {
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
    }, wait);
  });
}
