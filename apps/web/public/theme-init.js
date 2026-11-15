// Applies the stored theme before first paint (also to the splash screen), and prepares the
// splash text: its language, and "updating" right after an automatic update reload (#64).
// External file because the Content-Security-Policy forbids inline scripts.
// Keep in sync with src/settings/storage.ts, src/theme/theme.ts and src/pwa/autoUpdate.ts.
(function () {
  var theme = 'system';
  var language = 'system';
  try {
    var stored = JSON.parse(localStorage.getItem('p1meter.settings') || '{}');
    if (stored.theme === 'light' || stored.theme === 'dark') theme = stored.theme;
    if (stored.language === 'nl' || stored.language === 'en') language = stored.language;
  } catch (e) {
    // Storage unavailable or corrupt: follow the system setting.
  }
  if (language === 'system') {
    // As resolveLanguage in src/i18n/language.ts: the device's first language.
    var first = (navigator.languages && navigator.languages[0]) || '';
    language = first.toLowerCase().indexOf('nl') === 0 ? 'nl' : 'en';
  }
  document.documentElement.setAttribute('data-splash-lang', language);
  try {
    if (sessionStorage.getItem('p1meter.updatedFrom') !== null) {
      document.documentElement.setAttribute('data-splash', 'updating');
    }
  } catch (e) {
    // Without storage the splash simply shows as on a normal start.
  }
  var dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('ion-palette-dark', dark);
})();
