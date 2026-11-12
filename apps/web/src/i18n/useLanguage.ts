import { useEffect } from 'react';
import type { Language } from '../settings/storage';
import i18n from './index';
import { deviceLanguages, resolveLanguage } from './language';

/** Keeps i18next and `<html lang>` in sync with the setting and, for "system", the device. */
export function useLanguage(setting: Language) {
  useEffect(() => {
    const apply = () => {
      const language = resolveLanguage(setting, deviceLanguages());
      document.documentElement.lang = language;
      if (i18n.language !== language) void i18n.changeLanguage(language);
    };
    apply();
    window.addEventListener('languagechange', apply);
    return () => window.removeEventListener('languagechange', apply);
  }, [setting]);
}
