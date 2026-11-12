import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { loadSettings } from '../settings/storage';
import en from './en.json';
import { deviceLanguages, resolveLanguage, type AppLanguage } from './language';
import nl from './nl.json';

export const resources = { nl: { translation: nl }, en: { translation: en } } as const;

// Start in the stored language, so the first render does not flash Dutch for English users.
const initial = resolveLanguage(loadSettings().language, deviceLanguages());
if (typeof document !== 'undefined') document.documentElement.lang = initial;

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  supportedLngs: ['nl', 'en'],
  fallbackLng: 'nl',
  initAsync: false,
  interpolation: { escapeValue: false },
});

/** The active language (always one of the supported ones). */
export const appLanguage = (): AppLanguage => (i18n.language === 'en' ? 'en' : 'nl');

export default i18n;
