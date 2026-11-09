import { useEffect } from 'react';
import type { Theme } from '../settings/storage';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isDark(theme: Theme, systemDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemDark);
}

/** Keeps `.ion-palette-dark` on <html> in sync with the setting and, for "system", the OS. */
export function useThemeClass(theme: Theme, root: HTMLElement = document.documentElement) {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => root.classList.toggle('ion-palette-dark', isDark(theme, media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, root]);
}
