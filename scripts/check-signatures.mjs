#!/usr/bin/env node
// Fails when a file contains something that looks like a real household signature.
// Signatures give access to a household's data, so only fictional ones may be committed.
// Usage: node scripts/check-signatures.mjs [files…]   (no files: all tracked files)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SIGNATURE = /\b\d{4}-[A-Z]{3}-[A-Z]{4}-V\d{2}-([0-9A-F]{6})-([0-9A-F]{6})\b/gi;
// Fictional IDs used in docs and tests: chip part A1B2C3 or FFFFFF.
const ALLOWED_CHIP = /^(A1B2C3|FFFFFF)$/i;

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);

let found = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted or unreadable
  }
  for (const match of text.matchAll(SIGNATURE)) {
    if (ALLOWED_CHIP.test(match[1])) continue;
    const line = text.slice(0, match.index).split('\n').length;
    console.error(`${file}:${line}: looks like a real signature (…-${match[2].slice(-4)})`);
    found++;
  }
}

if (found > 0) {
  console.error(
    `\n${found} possible real signature(s). Use a fictional one, e.g. 2019-ETI-EMON-V01-A1B2C3-000000.`,
  );
  process.exit(1);
}
