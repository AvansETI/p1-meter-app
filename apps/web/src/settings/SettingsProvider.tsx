import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SettingsContext, type SettingsValue } from './context';
import { loadSettings, saveSettings, type Settings } from './storage';

export function SettingsProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Settings;
}) {
  const [settings, setSettings] = useState<Settings>(() => initial ?? loadSettings());

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      setEmonId: (emonId) => update({ emonId }),
      setTheme: (theme) => update({ theme }),
      dismissInstallHint: () => update({ installHintDismissedAt: new Date().toISOString() }),
    }),
    [settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
