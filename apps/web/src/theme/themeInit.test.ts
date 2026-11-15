import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInThisContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

// public/theme-init.js runs before first paint; here it runs against jsdom's document.
const script = readFileSync(path.join(__dirname, '../../public/theme-init.js'), 'utf8');
const run = () => {
  runInThisContext(script);
};
const html = document.documentElement;

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  html.removeAttribute('data-splash');
  html.removeAttribute('data-splash-lang');
  vi.restoreAllMocks();
});

describe('theme-init.js splash', () => {
  it('shows the splash as on a normal start, in the device language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nl-NL', 'en']);
    run();
    expect(html.dataset.splash).toBeUndefined();
    expect(html.dataset.splashLang).toBe('nl');
  });

  it('says "updating" right after an update reload, in the chosen language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nl-NL']);
    localStorage.setItem('p1meter.settings', JSON.stringify({ language: 'en' }));
    sessionStorage.setItem('p1meter.updatedFrom', '0.13.0');
    run();
    expect(html.dataset.splash).toBe('updated');
    expect(html.dataset.splashLang).toBe('en');
  });
});
