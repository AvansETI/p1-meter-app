#!/usr/bin/env bash
# Publishes a package to the rolling "main-latest" pre-release (CI only; needs GH_TOKEN).
# The package is uploaded before the manifest, so the server never sees a manifest
# pointing to a missing file.
set -euo pipefail

out="${1:-out}"
tag="main-latest"
repo="${GITHUB_REPOSITORY:?}"
sha="${GITHUB_SHA:?}"
file="$(jq -r .file "$out/manifest.json")"

# Move (or create) the tag to the built commit.
if gh api "repos/$repo/git/refs/tags/$tag" >/dev/null 2>&1; then
  gh api -X PATCH "repos/$repo/git/refs/tags/$tag" -f sha="$sha" -F force=true >/dev/null
else
  gh api -X POST "repos/$repo/git/refs" -f ref="refs/tags/$tag" -f sha="$sha" >/dev/null
fi

if ! gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
  gh release create "$tag" --repo "$repo" --prerelease --title "Latest build of main" \
    --notes "Rolling build of the main branch, used for automatic deployment. Not a versioned release."
fi

gh release upload "$tag" "$out/$file" --repo "$repo" --clobber
gh release upload "$tag" "$out/manifest.json" --repo "$repo" --clobber

# Remove packages of earlier builds.
gh release view "$tag" --repo "$repo" --json assets --jq '.assets[].name' |
  grep -E '^p1-meter-app-.*\.tar\.gz$' | grep -vx "$file" |
  while read -r old; do gh release delete-asset "$tag" "$old" --repo "$repo" --yes; done

echo "Published $file to release $tag"
