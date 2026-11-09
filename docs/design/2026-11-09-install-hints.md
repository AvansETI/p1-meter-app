# Install hints for the PWA

- Issue: #7
- Status: **approved** (2026-11-09)
- Date: 2026-11-09
- Builds on: [monorepo scaffolding](2026-11-09-monorepo-scaffolding.md) §7 (PWA),
  [visual design](2026-11-09-visual-design.md)

## 1. Goal

Help people install MNEXT Energiemeter as an app, with the right instructions for their
device and browser, without nagging.

## 2. How installing works per platform

| Platform                                          | Install route                         | What the app can do                    |
| ------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| Chrome, Edge, Samsung Internet (Android, desktop) | `beforeinstallprompt` → native dialog | own "Installeren" button that opens it |
| iOS / iPadOS (Safari, Chrome, Edge, …)            | Share → "Zet op beginscherm"          | instructions only                      |
| Safari on macOS 17+                               | Archief → "Voeg toe aan Dock"         | instructions only                      |
| Firefox on Android                                | menu ⋮ → "Installeren"                | instructions only                      |
| Firefox desktop, other                            | none                                  | nothing (one line in Settings)         |

The native dialog only exists over **HTTPS or localhost** with a registered service worker
(production build). Chromium may also decide not to fire `beforeinstallprompt` (engagement
heuristics, already installed, dismissed recently); the app then shows nothing on that
browser rather than wrong instructions.

## 3. Detection

`install/platform.ts` — a pure function, tested with user-agent fixtures:

```ts
type InstallMethod =
  | 'installed'        // already running as installed app
  | 'prompt'           // beforeinstallprompt captured → our button opens the native dialog
  | 'ios'              // share sheet → "Zet op beginscherm"
  | 'macos-safari'     // Archief → "Voeg toe aan Dock"
  | 'firefox-android'  // menu → "Installeren"
  | 'unsupported';

detectInstallMethod({
  userAgent, maxTouchPoints, standalone /* display-mode or navigator.standalone */,
  hasPromptEvent,
}): InstallMethod
```

Rules, in order:

1. `display-mode: standalone` (or `navigator.standalone === true` on iOS) → `installed`.
2. A captured `beforeinstallprompt` event → `prompt`.
3. iPhone/iPod/iPad, or "Macintosh" with `maxTouchPoints > 1` (iPadOS reports a desktop UA)
   → `ios`. Applies to Safari, Chrome (`CriOS`), Edge (`EdgiOS`) and Firefox (`FxiOS`) alike,
   since all use the iOS share sheet (iOS 16.4+).
4. macOS Safari 17+ (`Version/17+ … Safari`, not Chrome/Edge/Firefox/Opera) → `macos-safari`.
5. Android + Firefox → `firefox-android`.
6. Otherwise → `unsupported`.

Capturing the event: `install/prompt.ts` registers listeners for `beforeinstallprompt` (call
`preventDefault()`, keep the event) and `appinstalled` (forget it, mark installed) **in
`main.tsx` before React renders**, because Chromium can fire the event before the app is
mounted. A small store (`useSyncExternalStore`) exposes `{ method, promptInstall() }`.

## 4. Where hints appear

| Place          | When                                                                  | Content                                                       |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| Welcome screen | method ≠ `installed`/`unsupported`                                    | a text button "Installeer als app" under the form (no banner) |
| Live           | EMON ID set, method ≠ `installed`/`unsupported`, not dismissed < 30 d | banner above the tab bar (desktop: bottom of the content)     |
| Settings       | method ≠ `installed`                                                  | item "App installeren"; for `unsupported` a note instead      |

Action behind every hint:

- `prompt` → `promptInstall()` opens the native dialog. On `accepted` the hints disappear
  (also via `appinstalled`); on `dismissed` nothing else happens.
- `ios`, `macos-safari`, `firefox-android` → opens the instructions sheet (§5).

### 4.1 Live banner

```
┌──────────────────────────────────────────┐
│ [icon]  Zet Energiemeter op je            │
│         beginscherm voor snelle toegang.  │
│         [Installeren]  (or [Hoe?])     ✕  │
└──────────────────────────────────────────┘
```

- MNEXT app icon (`/brand/pwa-64x64.png`), surface background, 5 px radius.
- ✕ stores `installHintDismissedAt` (ISO date) in the local settings; the banner returns after
  30 days. Settings and Welcome keep working regardless.
- Not shown while the meter is offline (the offline notice has priority) and not on the
  welcome screen.

### 4.2 Settings

Section "App":

- `prompt` / instruction methods: item "App installeren" (button).
- `unsupported`: note "Installeren als app kan in Chrome, Edge of Safari."
- `installed`: section hidden.

## 5. Instructions sheet

An `IonModal` (sheet on mobile, centred dialog on desktop) with numbered steps and the real
symbols (ionicons):

**iOS / iPadOS**

1. Tik op de **Deel**-knop [share-outline icon] — in Safari onderaan (iPhone) of bovenaan
   (iPad), in Chrome en Edge naast de adresbalk.
2. Scrol en kies **Zet op beginscherm** [add-square icon].
3. Tik op **Voeg toe**.

**Safari on macOS**

1. Kies in de menubalk **Archief** → **Voeg toe aan Dock**.
2. Klik op **Voeg toe**.

**Firefox on Android**

1. Tik op het menu [ellipsis-vertical icon].
2. Kies **Installeren** (of **Toevoegen aan startscherm**).

Each sheet ends with: "Daarna open je Energiemeter vanaf je beginscherm, net als een app."
All texts via i18n (`install.*`).

## 6. Settings storage

`p1meter.settings` gets an optional `installHintDismissedAt` (ISO string). Schema stays
version 1 (optional field, older data stays valid).

## 7. Testing

| Area     | Tests                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| platform | UA fixtures: iPhone Safari/Chrome/Edge, iPad (desktop UA + touch), macOS Safari 17 and 16, macOS Chrome, Android Chrome, Android Firefox, Windows Firefox/Edge; standalone wins; captured event wins over UA |
| prompt   | event captured before mount; `promptInstall()` calls `prompt()` once and clears on `appinstalled`                                                                                                            |
| banner   | hidden without EMON ID, when installed, unsupported, offline, or dismissed < 30 days; shown again after 30 days                                                                                              |
| UI       | Settings shows the right item/note per method; instructions sheet shows the right steps                                                                                                                      |

Manual verification (acceptance criterion):

- **Desktop Chromium:** SSH tunnel to `localhost:4173` (`pnpm build && pnpm --filter @p1/web preview`).
- **Android Chrome:** the phone cannot use the tunnel easily; for testing, enable
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for
  `http://192.168.123.78:4173` (preview on `0.0.0.0`), or test after the LXC deployment over HTTPS.
- **iOS Safari:** instructions can be checked over plain HTTP; "Zet op beginscherm" works there
  too (without offline support until HTTPS).

`vite preview` gets `host: '0.0.0.0'` for LAN testing.

## 8. Out of scope

- Native app stores (#4), push notifications.
- Detecting whether a dismissed native dialog may be shown again (browser-controlled).
