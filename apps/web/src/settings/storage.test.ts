import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from './storage';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('settings storage', () => {
  it('round-trips settings', () => {
    const storage = memoryStorage();
    const settings = { version: 1 as const, emonId: 'X', theme: 'dark' as const };
    saveSettings(settings, storage);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it.each(['not json', '{"version":2}', '[]'])('falls back to defaults for %j', (raw) => {
    expect(loadSettings(memoryStorage({ [SETTINGS_KEY]: raw }))).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs an unknown theme', () => {
    const raw = JSON.stringify({ version: 1, emonId: 'X', theme: 'neon' });
    expect(loadSettings(memoryStorage({ [SETTINGS_KEY]: raw }))).toEqual({
      version: 1,
      emonId: 'X',
      theme: 'system',
    });
  });

  it('survives storage that throws', () => {
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error('blocked');
    };
    broken.setItem = () => {
      throw new Error('blocked');
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
  });
});
