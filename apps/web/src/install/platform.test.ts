import { describe, expect, it } from 'vitest';
import { detectInstallMethod } from './platform';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/131.0.2903.64 Mobile/15E148 Safari/605.1.15',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macSafari17:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  macSafari16:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  windowsFirefox:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
};

const env = (userAgent: string, extra: Partial<Parameters<typeof detectInstallMethod>[0]> = {}) =>
  detectInstallMethod({
    userAgent,
    maxTouchPoints: 0,
    standalone: false,
    hasPromptEvent: false,
    ...extra,
  });

describe('detectInstallMethod', () => {
  it.each([
    ['iPhone Safari', UA.iphoneSafari, 'ios'],
    ['iPhone Chrome', UA.iphoneChrome, 'ios'],
    ['iPhone Edge', UA.iphoneEdge, 'ios'],
    ['macOS Safari 17', UA.macSafari17, 'macos-safari'],
    ['macOS Safari 16', UA.macSafari16, 'unsupported'],
    ['macOS Chrome without prompt', UA.macChrome, 'unsupported'],
    ['Android Chrome without prompt', UA.androidChrome, 'unsupported'],
    ['Android Firefox', UA.androidFirefox, 'firefox-android'],
    ['Windows Firefox', UA.windowsFirefox, 'unsupported'],
    ['Windows Edge without prompt', UA.windowsEdge, 'unsupported'],
  ])('%s → %s', (_name, ua, method) => {
    expect(env(ua)).toBe(method);
  });

  it('recognises an iPad in desktop mode by its touch support', () => {
    expect(env(UA.ipadDesktopMode, { maxTouchPoints: 5 })).toBe('ios');
    expect(env(UA.ipadDesktopMode, { maxTouchPoints: 0 })).toBe('macos-safari');
  });

  it('prefers a captured install prompt over the user agent', () => {
    expect(env(UA.androidChrome, { hasPromptEvent: true })).toBe('prompt');
    expect(env(UA.windowsEdge, { hasPromptEvent: true })).toBe('prompt');
  });

  it('reports installed whenever running standalone', () => {
    expect(env(UA.iphoneSafari, { standalone: true })).toBe('installed');
    expect(env(UA.androidChrome, { standalone: true, hasPromptEvent: true })).toBe('installed');
  });
});
