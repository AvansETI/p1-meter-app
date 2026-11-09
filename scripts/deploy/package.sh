#!/usr/bin/env bash
# Builds the deployable package from an already built workspace (pnpm build).
# Usage: scripts/deploy/package.sh [output dir]   → <out>/p1-meter-app-<sha>.tar.gz + manifest.json
set -euo pipefail

out="${1:-out}"
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
rm -rf "$out"
mkdir -p "$out/app/web"

# The API with only its production dependencies.
pnpm --filter @p1/api deploy --prod "$out/app/api"
cp -r apps/web/dist "$out/app/web/dist"
cp .nvmrc LICENSE NOTICE "$out/app/"
# Server files the update script keeps in sync (systemd units and the updater itself).
mkdir -p "$out/app/deploy"
cp scripts/deploy/p1-meter-update scripts/deploy/p1-meter-app.service \
  scripts/deploy/p1-meter-update.service scripts/deploy/p1-meter-update.timer "$out/app/deploy/"

file="p1-meter-app-${sha:0:12}.tar.gz"
tar -czf "$out/$file" -C "$out" app
sum="$(sha256sum "$out/$file" | cut -d' ' -f1)"

jq -n \
  --arg sha "$sha" \
  --arg version "$(jq -r .version package.json)" \
  --arg createdAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg file "$file" \
  --arg sha256 "$sum" \
  --arg node "$(tr -d '[:space:]' <.nvmrc)" \
  '{sha: $sha, version: $version, createdAt: $createdAt, file: $file, sha256: $sha256, node: $node}' \
  >"$out/manifest.json"

echo "Packaged $file ($(du -h "$out/$file" | cut -f1))"
