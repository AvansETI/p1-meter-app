import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEASES, renderChangelog } from './releases';

const root = path.join(__dirname, '../../../..');
const appVersion = (
  JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8')) as { version: string }
).version;
const parts = (version: string) => version.split('.').map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! > y[i]!;
  return false;
};

describe('release notes (#82)', () => {
  it('have an entry for the version being released', () => {
    expect(RELEASES.map((r) => r.version)).toContain(appVersion);
  });

  it('list every version once, newest first, with a date and both languages', () => {
    RELEASES.forEach((release, i) => {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.en.trim()).not.toBe('');
      expect(release.nl.trim()).not.toBe('');
      const next = RELEASES[i + 1];
      if (next) {
        expect(newer(release.version, next.version)).toBe(true);
        expect(release.date >= next.date).toBe(true);
      }
    });
  });

  it('match CHANGELOG.md (run `pnpm changelog` after editing releases.ts)', () => {
    expect(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')).toBe(renderChangelog(RELEASES));
  });
});
