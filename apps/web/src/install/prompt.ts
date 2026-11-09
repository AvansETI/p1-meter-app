/** Chromium's install event; not in the DOM typings. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptState {
  hasPrompt: boolean;
  /** Installed during this visit (appinstalled event or accepted prompt). */
  installedNow: boolean;
}

let deferred: BeforeInstallPromptEvent | undefined;
let state: InstallPromptState = { hasPrompt: false, installedNow: false };
const listeners = new Set<() => void>();

function update(patch: Partial<InstallPromptState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/**
 * Captures the install events. Call once in main.tsx before React renders: Chromium may fire
 * `beforeinstallprompt` before the app has mounted.
 */
export function initInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's own mini-infobar away; we show our own hint.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update({ hasPrompt: true });
  });
  target.addEventListener('appinstalled', () => {
    deferred = undefined;
    update({ hasPrompt: false, installedNow: true });
  });
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getInstallPromptState = (): InstallPromptState => state;

/** Opens the native install dialog. The event can be used only once. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred;
  if (!event) return 'unavailable';
  deferred = undefined;
  update({ hasPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') update({ installedNow: true });
  return outcome;
}

/** Test helper. */
export function resetInstallPrompt(): void {
  deferred = undefined;
  state = { hasPrompt: false, installedNow: false };
}
