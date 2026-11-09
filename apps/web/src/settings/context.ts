import { createContext, useContext } from 'react';
import type { Settings, Theme } from './storage';

export interface SettingsValue {
  settings: Settings;
  setEmonId: (emonId: string | undefined) => void;
  setTheme: (theme: Theme) => void;
  dismissInstallHint: () => void;
}

export const SettingsContext = createContext<SettingsValue | null>(null);

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
