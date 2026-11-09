// Applies the stored theme before first paint (also to the splash screen).
// External file because the Content-Security-Policy forbids inline scripts.
// Keep in sync with src/settings/storage.ts and src/theme/theme.ts.
(function () {
  var theme = 'system';
  try {
    var stored = JSON.parse(localStorage.getItem('p1meter.settings') || '{}');
    if (stored.theme === 'light' || stored.theme === 'dark') theme = stored.theme;
  } catch (e) {
    // Storage unavailable or corrupt: follow the system setting.
  }
  var dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('ion-palette-dark', dark);
})();
