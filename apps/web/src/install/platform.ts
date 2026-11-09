export type InstallMethod =
  | 'installed' // already running as an installed app
  | 'prompt' // beforeinstallprompt captured: our button opens the native dialog
  | 'ios' // share sheet → "Zet op beginscherm"
  | 'macos-safari' // Archief → "Voeg toe aan Dock"
  | 'firefox-android' // menu → "Installeren"
  | 'unsupported';

export interface InstallEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  /** Running as installed app (display-mode standalone, or navigator.standalone on iOS). */
  standalone: boolean;
  /** A beforeinstallprompt event has been captured. */
  hasPromptEvent: boolean;
}

/** Decides how this browser can install the app (docs/design/2026-11-09-install-hints.md §3). */
export function detectInstallMethod(env: InstallEnvironment): InstallMethod {
  const { userAgent: ua, maxTouchPoints, standalone, hasPromptEvent } = env;
  if (standalone) return 'installed';
  if (hasPromptEvent) return 'prompt';

  // iPadOS reports a desktop Mac user agent; touch support gives it away.
  const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (isIos) return 'ios';

  const safariVersion = /Version\/(\d+)[\d.]* .*Safari\//.exec(ua)?.[1];
  const otherEngine = /Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua);
  if (/Macintosh/.test(ua) && !otherEngine && Number(safariVersion) >= 17) return 'macos-safari';

  if (/Android/.test(ua) && /Firefox\//.test(ua)) return 'firefox-android';
  return 'unsupported';
}

/** Whether the app currently runs as an installed app. */
export function isStandalone(win: Window = window): boolean {
  const media = (query: string) => win.matchMedia?.(query).matches ?? false;
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone;
  return (
    media('(display-mode: standalone)') ||
    media('(display-mode: window-controls-overlay)') ||
    iosStandalone === true
  );
}
