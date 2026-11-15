#!/usr/bin/env node
// Writes CHANGELOG.md from the release list in the web app (docs/design/2026-11-15-release-notes.md).
//
//   pnpm changelog
//
// Node strips the TypeScript types of releases.ts itself, so no build step is needed.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASES, renderChangelog } from '../apps/web/src/releases/releases.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
writeFileSync(path.join(root, 'CHANGELOG.md'), renderChangelog(RELEASES));
console.log(`CHANGELOG.md: ${RELEASES.length} versions, newest ${RELEASES[0].version}.`);
