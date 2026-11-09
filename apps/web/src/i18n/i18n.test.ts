import { API_ERRORS } from '@p1/shared';
import { describe, expect, it } from 'vitest';
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
