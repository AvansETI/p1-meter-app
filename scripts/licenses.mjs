#!/usr/bin/env node
// Third-party license handling (docs: README "License", NOTICE).
//
//   node scripts/licenses.mjs check
//     Fails when a dependency has a license outside the allowlist. Production dependencies
//     (shipped to browsers or run on the server) must be permissive; build-only tools may
//     also use the weak/data licenses listed under DEV_ONLY.
//
//   node scripts/licenses.mjs generate <web|api> <output file>
//     Writes the license and NOTICE texts of all production dependencies of an app, so they
//     ship with the build as the licenses require.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PRODUCTION_ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
  'OFL-1.1', // fonts (Nunito)
]);
// Allowed for build and test tooling only; these packages are not distributed.
const DEV_ONLY = new Set(['MPL-2.0', 'CC-BY-4.0', 'Python-2.0']);

/** `pnpm licenses list --json` in a directory, as { license: [{ name, versions, paths, … }] }. */
function listLicenses(cwd, production) {
  const args = ['licenses', 'list', '--json', ...(production ? ['--prod'] : [])];
  const out = execFileSync('pnpm', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out || '{}');
}

/** Accepts SPDX expressions like "(MIT OR Apache-2.0)" or "MIT AND ISC". */
function isAllowed(expression, allowed) {
  const clean = expression.replace(/[()]/g, '').trim();
  if (clean.includes(' OR ')) return clean.split(' OR ').some((part) => isAllowed(part, allowed));
  if (clean.includes(' AND '))
    return clean.split(' AND ').every((part) => isAllowed(part, allowed));
  return allowed.has(clean);
}

function check() {
  const problems = [];
  const production = [...new Set([...PRODUCTION_ALLOWED])];
  for (const app of ['apps/web', 'apps/api']) {
    for (const [license, packages] of Object.entries(listLicenses(path.join(ROOT, app), true))) {
      if (isAllowed(license, PRODUCTION_ALLOWED)) continue;
      for (const pkg of packages) problems.push(`${app} (production): ${pkg.name} — ${license}`);
    }
  }
  const devAllowed = new Set([...production, ...DEV_ONLY]);
  for (const [license, packages] of Object.entries(listLicenses(ROOT, false))) {
    if (isAllowed(license, devAllowed)) continue;
    for (const pkg of packages) problems.push(`workspace: ${pkg.name} — ${license}`);
  }
  if (problems.length > 0) {
    console.error('Dependencies with licenses outside the allowlist:\n');
    console.error(problems.map((p) => `  ${p}`).join('\n'));
    console.error('\nReview the license; if it is acceptable, add it to scripts/licenses.mjs.');
    process.exit(1);
  }
  console.log('All dependency licenses are on the allowlist.');
}

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([.-].*)?$/i;

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/** Author from package.json, as text. */
function packageAuthor(dir) {
  try {
    const { author } = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return typeof author === 'string' ? author : author?.name;
  } catch {
    return undefined;
  }
}

/** Text for packages that ship no license file: the standard MIT text, or a pointer. */
function fallbackText(pkg, dir) {
  if (pkg.license === 'MIT') {
    const author = (dir && packageAuthor(dir)) ?? `the ${pkg.name} authors`;
    return `(No license file in the package; standard MIT text added.)\n\nCopyright (c) ${author}\n\n${MIT_TEXT}`;
  }
  return `(No license file in the package; license: ${pkg.license}. See ${pkg.homepage ?? 'the package'}.)`;
}

function generate(app, output) {
  const entries = Object.entries(listLicenses(path.join(ROOT, 'apps', app), true))
    .flatMap(([license, packages]) => packages.map((pkg) => ({ ...pkg, license })))
    .filter((pkg) => !pkg.name.startsWith('@p1/'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sections = entries.map((pkg) => {
    const dir = pkg.paths?.[0];
    const files =
      dir && existsSync(dir)
        ? readdirSync(dir)
            .filter((file) => LICENSE_FILE.test(file))
            .sort()
        : [];
    const texts = files.map((file) => readFileSync(path.join(dir, file), 'utf8').trim());
    return [
      `${pkg.name} ${pkg.versions.join(', ')} — ${pkg.license}`,
      pkg.homepage ?? '',
      '-'.repeat(72),
      texts.length > 0 ? texts.join('\n\n') : fallbackText(pkg, dir),
    ]
      .filter(Boolean)
      .join('\n');
  });

  const header = [
    `Third-party software in MNEXT Energiemeter (${app})`,
    '',
    'This file lists the open-source packages included in this build, with their',
    'license and notice texts. MNEXT Energiemeter itself is licensed under the',
    'Apache License 2.0; see LICENSE and NOTICE in the source repository.',
    '',
    `${entries.length} packages.`,
  ].join('\n');

  writeFileSync(
    output,
    `${header}\n\n${'='.repeat(72)}\n\n${sections.join(`\n\n${'='.repeat(72)}\n\n`)}\n`,
  );
  console.log(`Wrote ${entries.length} third-party licenses to ${output}`);
}

const [command, app, output] = process.argv.slice(2);
if (command === 'check') check();
else if (command === 'generate' && (app === 'web' || app === 'api') && output)
  generate(app, output);
else {
  console.error('Usage: licenses.mjs check | generate <web|api> <output file>');
  process.exit(2);
}
