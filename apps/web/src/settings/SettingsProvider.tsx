import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '../i18n/useLanguage';
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

  // Here rather than in the shell, so every screen (and test) under the provider follows it.
  useLanguage(settings.language);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      setEmonId: (emonId) => update({ emonId }),
      setTheme: (theme) => update({ theme }),
      setLanguage: (language) => update({ language }),
      dismissInstallHint: () => update({ installHintDismissedAt: new Date().toISOString() }),
      turnOffTariffHint: () => update({ tariffHintOff: true }),
    }),
    [settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
