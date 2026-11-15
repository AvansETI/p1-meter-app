import type { GasSharedSettings } from '@p1/shared';
import { createContext, useContext } from 'react';
import type { GasSettings, Language, Settings, Theme } from './storage';

export interface SettingsValue {
  settings: Settings;
  setEmonId: (emonId: string | undefined) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setFestive: (festive: boolean) => void;
  /** Merges a change into the gas analysis settings. */
  setGas: (patch: Partial<GasSettings>) => void;
  /** Takes over the household's shared gas settings (null: the defaults); keeps `enabled`. */
  adoptGas: (shared: GasSharedSettings | null, emonId: string) => void;
  /** The server has `sent`; clears the dirty mark unless the settings changed meanwhile. */
  markGasSynced: (sent: GasSharedSettings, emonId: string) => void;
  dismissInstallHint: () => void;
  turnOffTariffHint: () => void;
}

export const SettingsContext = createContext<SettingsValue | null>(null);

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
