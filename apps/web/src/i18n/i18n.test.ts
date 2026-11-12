import { API_ERRORS } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import en from './en.json';
import nl from './nl.json';

// Collect every translation key literal (e.g. 'settings.title') used in the app's source.
const sources = import.meta.glob<string>('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const NAMESPACES = Object.keys(nl).join('|');
const KEY_LITERAL = new RegExp(`'((?:${NAMESPACES})\\.[\\w.]+)'`, 'g');

function hasKey(dict: unknown, key: string): boolean {
  // Keys used with `count` exist as plural forms (key_one, key_other).
  return hasText(dict, key) || (hasText(dict, `${key}_one`) && hasText(dict, `${key}_other`));
}

function hasText(dict: unknown, key: string): boolean {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string';
}

describe('Dutch translations', () => {
  const used = new Set<string>();
  for (const [file, code] of Object.entries(sources)) {
    if (file.includes('.test.')) continue;
    for (const match of code.matchAll(KEY_LITERAL)) used.add(match[1]!);
  }
  // Error messages are looked up dynamically by API error code.
  for (const code of API_ERRORS) used.add(`welcome.errors.${code}`);

  it('finds translation keys in the source', () => {
    expect(used.size).toBeGreaterThan(20);
  });

  it.each([...used])('has a Dutch text for %s', (key) => {
    expect(hasKey(nl, key)).toBe(true);
  });
});

function leafKeys(dict: object, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leafKeys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('English translations', () => {
  it('have exactly the same keys as the Dutch ones', () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(nl).sort());
  });
});
