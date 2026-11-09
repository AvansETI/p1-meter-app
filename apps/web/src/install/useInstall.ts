import { useState, useSyncExternalStore } from 'react';
import { detectInstallMethod, isStandalone, type InstallMethod } from './platform';
import { getInstallPromptState, promptInstall, subscribeInstallPrompt } from './prompt';

/** Methods for which we can offer something: the native dialog or instructions. */
export const OFFERABLE: ReadonlySet<InstallMethod> = new Set([
  'prompt',
  'ios',
  'macos-safari',
  'firefox-android',
]);

/** Current install method plus an action that opens the dialog or the instructions sheet. */
export function useInstall() {
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState);
  const [sheetOpen, setSheetOpen] = useState(false);

  const method: InstallMethod = prompt.installedNow
    ? 'installed'
    : detectInstallMethod({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        standalone: isStandalone(),
        hasPromptEvent: prompt.hasPrompt,
      });

  const start = () => {
    if (method === 'prompt') void promptInstall();
    else if (OFFERABLE.has(method)) setSheetOpen(true);
  };

  return { method, start, sheetOpen, closeSheet: () => setSheetOpen(false) };
}
