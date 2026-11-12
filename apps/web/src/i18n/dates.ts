import { appLanguage } from './index';
import { dateLocale } from './language';

const cache = new Map<string, Intl.DateTimeFormat>();

/**
 * Intl.DateTimeFormat for the active language, created once per language and options.
 * Call it at format time (not at module load), so a language switch takes effect.
 */
export function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = currentDateLocale();
  const key = `${locale} ${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    cache.set(key, format);
  }
  return format;
}

/** 'nl-NL' or 'en-GB', e.g. for IonDatetime. */
export const currentDateLocale = () => dateLocale(appLanguage());
