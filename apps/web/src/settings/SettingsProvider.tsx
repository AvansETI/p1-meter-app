import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { SettingsContext, type SettingsValue } from './context';
import {
  DEFAULT_GAS_SETTINGS,
  loadSettings,
  saveSettings,
  sharedGas,
  type Settings,
} from './storage';

export function SettingsProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Settings;
}) {
  const [settings, setSettings] = useState<Settings>(() => initial ?? loadSettings());

  const update = useCallback(
    (patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => {
      setSettings((current) => {
        const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  // Here rather than in the shell, so every screen (and test) under the provider follows it.
  useLanguage(settings.language);

  // Stable across changes, so effects that depend on an action do not run on every change.
  const actions = useMemo<Omit<SettingsValue, 'settings'>>(
    () => ({
      setEmonId: (emonId) => update({ emonId }),
      setTheme: (theme) => update({ theme }),
      setLanguage: (language) => update({ language }),
      setFestive: (festive) => update({ festive }),
      setGas: (patch) =>
        update((current) => ({
          gas: { ...current.gas, ...patch },
          // Turning the analysis on or off stays on this device.
          gasDirty: current.gasDirty || Object.keys(patch).some((key) => key !== 'enabled'),
        })),
      adoptGas: (shared, emonId) =>
        update((current) => ({
          gas: { ...(shared ?? sharedGas(DEFAULT_GAS_SETTINGS)), enabled: current.gas.enabled },
          gasDirty: false,
          gasSyncedFor: emonId,
        })),
      markGasSynced: (sent, emonId) =>
        update((current) => ({
          gasDirty:
            current.gasDirty === true &&
            JSON.stringify(sharedGas(current.gas)) !== JSON.stringify(sent),
          gasSyncedFor: emonId,
        })),
      dismissInstallHint: () => update({ installHintDismissedAt: new Date().toISOString() }),
      turnOffTariffHint: () => update({ tariffHintOff: true }),
    }),
    [update],
  );
  const value = useMemo<SettingsValue>(() => ({ settings, ...actions }), [settings, actions]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
