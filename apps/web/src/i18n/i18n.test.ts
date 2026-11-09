import { describe, expect, it } from 'vitest';
import nl from './nl.json';

// Collect every `t('key')` call in the app's components.
const sources = import.meta.glob<string>('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

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
    for (const match of code.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(match[1]!);
    for (const match of code.matchAll(/labelKey:\s*'([\w.]+)'/g)) used.add(match[1]!);
  }

  it('finds translation keys in the source', () => {
    expect(used.size).toBeGreaterThan(5);
  });

  it.each([...used])('has a Dutch text for %s', (key) => {
    expect(hasKey(nl, key)).toBe(true);
  });
});
