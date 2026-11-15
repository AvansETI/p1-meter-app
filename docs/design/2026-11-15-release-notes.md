# Release notes

- Issue: #82
- Status: **approved** (2026-11-15)
- Date: 2026-11-15

## 1. Goal

One list of all versions, each with its date and a one-sentence summary:

- for developers in `CHANGELOG.md` (English);
- for users in the app, under Settings → About, in the language of the app (Dutch or English).

## 2. Source and format

**One source for both:** `apps/web/src/releases/releases.ts`. It is a list, newest first, of
`{ version, date, en, nl }`:

- `date` is the release date (YYYY-MM-DD) in Dutch time;
- `en` and `nl` are one sentence each.

**`CHANGELOG.md` at the repository root:**

- The newest version is at the top, in the app as well.
- The format is [Keep a Changelog](https://keepachangelog.com/):
  `## [0.14.2] - 2026-11-15` followed by the English sentence.
- It also has a short header and links to the GitHub releases for the full notes.
- It is written from the list by `pnpm changelog` (`scripts/changelog.mjs`), so it cannot drift
  from the list.

**A test fails when:**

- the version in `apps/web/package.json` has no entry in the list;
- an entry lacks a sentence in either language;
- `CHANGELOG.md` differs from what the script writes.

So a release cannot ship without its note.

**Release routine:**

1. Add the new entry at the top of `releases.ts`.
2. Run `pnpm changelog`.
3. Both files go into the `chore(release)` commit.

## 3. In the app

Settings → About gets a link "Release notes" / "Wat is er nieuw", under the version number. It
opens a modal like the licenses, which keeps an installed app from restarting (#59).

The modal lists the versions newest first, each with:

- the version, with the current one marked "deze versie" / "this version";
- the date, in the app's date format;
- the sentence in the app's language.

The data is bundled with the app, about 3 kB, so it also works offline.

The "Updated to version X" toast after an automatic update stays as it is. Tapping it is out of
scope.

**About on desktop:** the About section is its own item "Over" / "About" in the desktop side
menu, with its own page (`/about`), and it is hidden under Settings from 992 px. On mobile the tab
bar has no room for it, so About stays at the bottom of Settings.

## 4. Texts

The 24 versions from 0.1.0 to 0.14.2 are summarised from their GitHub release notes.

## 5. Testing

- **Unit:**
  - the list is complete for the current version, both languages are filled, and versions are sorted newest first;
  - `CHANGELOG.md` is up to date.
- **Component:**
  - the link opens the modal, which shows the current version marked;
  - Dutch and English follow the language setting.

## 6. Out of scope

- Release notes in the update toast.
- Notes longer than one sentence (the GitHub releases have those).
