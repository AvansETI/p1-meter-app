import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './nl.json';

export const resources = { nl: { translation: nl } } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'nl',
  fallbackLng: 'nl',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export default i18n;
