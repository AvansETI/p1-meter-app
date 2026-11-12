import type { Language } from '../settings/storage';

export type AppLanguage = 'nl' | 'en';

/** The language to show: the explicit choice, or for "system" the device's first language. */
export function resolveLanguage(
  setting: Language,
  deviceLanguages: readonly string[],
): AppLanguage {
  if (setting !== 'system') return setting;
  return deviceLanguages[0]?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

/** Locale for dates: English uses en-GB for the day–month order and the 24-hour clock. */
export function dateLocale(language: AppLanguage): 'nl-NL' | 'en-GB' {
  return language === 'nl' ? 'nl-NL' : 'en-GB';
}

/** The device's preferred languages, most preferred first. */
export function deviceLanguages(): readonly string[] {
  return globalThis.navigator?.languages ?? [];
}
