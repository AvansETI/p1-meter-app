# Automatic update to a new version

- Issue: #64
- Status: **approved** (2026-11-14)
- Date: 2026-11-14
- Builds on: [install hints](2026-11-09-install-hints.md), [deployment](2026-11-09-deployment.md)

## 1. Problem

The service worker uses `registerType: 'prompt'`: when a new version is waiting, a toast
offers "Reload". Two gaps:

1. The browser only looks for a new service worker on a page load or navigation. An
   installed app on iOS usually resumes from memory without loading, so it can stay on an
   old version for days.
2. Users who dismiss the toast stay on the old version.

## 2. Decisions

| Topic          | Decision                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| When to check  | When the app comes back to the foreground (`visibilitychange` → visible) and every hour    |
| When to reload | As soon as a new version is ready, unless the user is busy (§4); then as soon as they stop |
| Where          | The reload keeps the current page (same URL)                                               |
| Feedback       | After the reload a toast for 3 s: "Bijgewerkt naar versie 0.10.0"                          |
| Toast button   | The "Reload" toast goes away                                                               |
| Service worker | Stays `registerType: 'prompt'`, so the app decides when to activate the new version        |

## 3. Checking for a new version

`pwa/useAutoUpdate.ts` replaces `UpdatePrompt`'s logic. With `useRegisterSW({ onRegisteredSW })`
it keeps the registration and calls `registration.update()`:

- when the document becomes visible again (at most once per minute),
- every 60 minutes while visible,
- when the API reports another version than the app's own build (at most once per minute).
  The API sends its version as `x-app-version` header on every response, and as a `version`
  event at the start of every live stream (`EventSource` does not expose headers). A
  deployment restarts the API, so the live stream reconnects and the app notices the new
  version within seconds; other screens notice it with their next fetch (within a minute).
  Added later.

`sw.js` and `index.html` are already served with `Cache-Control: no-cache`, so `update()`
always sees a new deployment.

## 4. Reloading, but not while the user is busy

When `needRefresh` becomes true the hook waits until the user is not busy, then calls
`updateServiceWorker(true)` (activate the new service worker and reload).

The user counts as busy while:

- an Ionic overlay is open (`ion-modal`, `ion-alert`, `ion-action-sheet`, `ion-popover`,
  `ion-picker`, `ion-loading`): e.g. the tariff period editor, changing the meter kit, the
  licenses, the install sheet;
- a text field has focus (`input`, `textarea`, or inside `ion-input`/`ion-textarea`).

All editing in the app happens in overlays (tariff periods, profile names, meter kit), so
no screen keeps unsaved changes outside one.

The hook re-checks every 5 seconds and on `visibilitychange`, so the reload follows within
seconds of closing the form. An app in the background reloads as soon as it is shown again,
before the user starts typing.

## 5. "Updated" message

Before reloading, the hook stores the old version in `sessionStorage`
(`p1meter.updatedFrom`). After start, if that key exists and differs from `__APP_VERSION__`,
an `IonToast` shows `pwa.updated` ("Bijgewerkt naar versie {{version}}" / "Updated to version
{{version}}") for 3 seconds, and the key is removed. Without storage the reload still works,
only the message is skipped.

### 5.1 Splash screen during an update (added later)

An update found at start-up used to show the splash twice: the first splash, the reload, and
a second splash with the intro and the 3.5 s loading bar starting over. Now:

- Before the reload `useReloadWhenIdle` sets `data-splash="updating"` on `<html>`: a splash
  that is still showing says "Bijwerken…" / "Updating…" under a running (indeterminate) bar.
- `theme-init.js` sets the same attribute before first paint when `p1meter.updatedFrom` is
  in `sessionStorage`, so after the reload the splash continues with the same text and bar,
  without the logo intro, and `hideSplash` adds no minimum time.
- `theme-init.js` also sets `data-splash-lang` (the chosen language, or the device's first
  language as in `resolveLanguage`), because the splash is shown before i18n loads.

## 6. Testing

- `busy.test.ts`: open overlays and focused inputs count as busy; nothing else does.
- `useAutoUpdate.test.tsx` (mocked `virtual:pwa-register/react`): reloads right away when not
  busy; waits while a modal is open and reloads after it closes; calls `update()` on
  visibility and hourly (fake timers); stores the old version.
- `UpdateToast.test.tsx`: shows the message once after an update, not on a normal start.
- Manual: build + preview, open the app, deploy a new build, bring the app to the foreground
  → it reloads on the same page and shows the message; with the tariff editor open it waits.

## 7. Out of scope

- Forcing a reload for API compatibility (the API stays backwards compatible).
- Release notes in the app.
