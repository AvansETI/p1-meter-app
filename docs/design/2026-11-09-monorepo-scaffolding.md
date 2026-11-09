# Monorepo scaffolding: app shell and PWA

- Issue: #3
- Status: **approved** (2026-11-09)
- Date: 2026-11-09
- Builds on: [architecture](2026-11-09-architecture.md), [visual design](2026-11-09-visual-design.md)

## 1. Goal

A running, installable app shell in the MNEXT house style and an API skeleton, with the
tooling every later feature relies on: TypeScript, lint/format, tests, git hooks and CI.
No InfluxDB access, signature handling or real data yet.

## 2. Repository layout

```
p1-meter-app/
├─ apps/
│  ├─ web/
│  │  ├─ index.html                 # includes inline splash markup + CSS
│  │  ├─ public/brand/              # MNEXT logos + SOURCES.md
│  │  ├─ pwa-assets.config.ts       # icon generation
│  │  ├─ vite.config.ts
│  │  └─ src/
│  │     ├─ main.tsx                # Ionic setup, i18n init, splash hand-off, SW registration
│  │     ├─ App.tsx                 # router, split pane, tabs
│  │     ├─ splash.ts               # min-duration + fade-out logic
│  │     ├─ pwa/UpdatePrompt.tsx    # "new version available" toast
│  │     ├─ components/SideMenu.tsx
│  │     ├─ pages/{Live,History,Settings}Page.tsx
│  │     ├─ i18n/{index.ts,nl.json}
│  │     └─ theme/{variables.css,fonts.css}
│  └─ api/
│     └─ src/
│        ├─ index.ts                # entry: load config, build server, listen
│        ├─ server.ts               # buildServer(config) — used by tests too
│        ├─ config.ts               # zod-validated environment
│        └─ routes/health.ts
├─ packages/
│  └─ shared/src/{index.ts,api.ts}  # API types (HealthResponse, …)
├─ .github/workflows/ci.yml
├─ eslint.config.js
├─ .prettierrc.json, .prettierignore
├─ lefthook.yml
├─ commitlint.config.js
├─ vitest.config.ts                 # root config listing the three projects
├─ tsconfig.base.json
├─ pnpm-workspace.yaml
└─ package.json
```

## 3. Toolchain and versions

Versions are the latest that satisfy all peer dependencies on 2026-11-09. Ranges use `^`;
the lockfile pins exact versions.

| Area            | Package                                                  | Version            | Note                                                     |
| --------------- | -------------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| Runtime         | Node                                                     | 26.13.0            | `.nvmrc`                                                 |
| Package manager | pnpm                                                     | 12.18.0            | `packageManager` field in root `package.json`            |
| Language        | typescript                                               | ~6.0.3             | **not 7.x**: typescript-eslint supports `<6.1`           |
| Web build       | vite                                                     | ^8.3               |                                                          |
|                 | @vitejs/plugin-react                                     | ^6.3               |                                                          |
| UI              | react, react-dom                                         | ^19.3              |                                                          |
|                 | @ionic/react, @ionic/react-router                        | ^9.0               |                                                          |
|                 | react-router, react-router-dom                           | ^6.30              | **not 7/8**: `@ionic/react-router` 9 requires `>=6.4 <7` |
|                 | ionicons                                                 | ^8.1               |                                                          |
|                 | @fontsource-variable/nunito                              | ^5.3               | self-hosted font                                         |
| i18n            | i18next / react-i18next                                  | ^27.0 / ^18.0      |                                                          |
| PWA             | vite-plugin-pwa                                          | ^2.0               | Workbox 7.4                                              |
|                 | @vite-pwa/assets-generator                               | ^2.0               | icons from SVG                                           |
| API             | fastify                                                  | ^5.12              |                                                          |
|                 | @fastify/static, @fastify/helmet                         | ^10.1 / ^13.2      |                                                          |
|                 | zod                                                      | ^4.6               | config and API schemas                                   |
|                 | pino-pretty                                              | ^13.2              | dev only                                                 |
|                 | tsx                                                      | ^4.23              | dev runner (watch)                                       |
|                 | tsdown                                                   | ^0.23              | production bundle of the API incl. `shared`              |
| Test            | vitest                                                   | ^5.1               |                                                          |
|                 | jsdom, @testing-library/react, @testing-library/jest-dom | ^31 / ^16.3 / ^7.0 | web tests                                                |
| Lint/format     | eslint, @eslint/js                                       | ^10.14 / ^10.0     | flat config                                              |
|                 | typescript-eslint                                        | ^8.72              |                                                          |
|                 | eslint-plugin-react-hooks, eslint-plugin-react-refresh   | ^7.1 / ^0.5        |                                                          |
|                 | prettier, eslint-config-prettier                         | ^3.9 / ^10.1       |                                                          |
| Hooks           | lefthook                                                 | ^2.2               |                                                          |
|                 | @commitlint/cli, @commitlint/config-conventional         | ^21.2              |                                                          |
| Dev             | concurrently                                             | ^10.0              | run web + api                                            |

### 3.1 Supply-chain settings (`pnpm-workspace.yaml`)

- `minimumReleaseAge: 10080` — pnpm refuses package versions younger than 7 days, so a
  freshly compromised release is not picked up automatically.
- `onlyBuiltDependencies:` an explicit allowlist (e.g. `esbuild`, `lefthook`) — install
  scripts of all other dependencies are blocked (pnpm default).
- Lockfile committed; CI installs with `--frozen-lockfile`.

## 4. Root scripts

| Script                         | Does                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| `pnpm dev`                     | `concurrently` → api (`tsx watch`) + web (`vite`)               |
| `pnpm build`                   | web (`vite build`) and api (`tsdown`)                           |
| `pnpm start`                   | run the built api in production mode, serving the built web app |
| `pnpm lint`                    | `eslint .`                                                      |
| `pnpm format` / `format:check` | `prettier --write .` / `--check .`                              |
| `pnpm typecheck`               | `tsc --noEmit` per package (`pnpm -r typecheck`)                |
| `pnpm test`                    | `vitest run` (all projects)                                     |
| `prepare`                      | `lefthook install` (runs after `pnpm install`)                  |

## 5. Shared package

`packages/shared` is consumed **as TypeScript source** (`"exports": { ".": "./src/index.ts" }`):

- Vite compiles it directly for the web app.
- `tsx` runs it directly for the API in development.
- `tsdown` bundles it into the API's production build, so production has no runtime
  dependency on TypeScript sources.

No separate build step for `shared`; it only has `typecheck` and `test`.
First content: `HealthResponse` type and an `API_BASE = '/api/v1'` constant.

## 6. Web app

### 6.1 Ionic setup

- `setupIonicReact()` without forcing `mode`: Ionic picks `ios` on iOS and `md` elsewhere.
- Ionic core CSS + the **system dark palette**
  (`@ionic/react/css/palettes/dark.system.css`), then `theme/variables.css` overrides the
  tokens from the visual design (§3) for light (`:root`) and dark
  (`@media (prefers-color-scheme: dark)`). A manual light/dark override is a later
  Settings feature.
- `theme/fonts.css` imports `@fontsource-variable/nunito` and sets
  `--ion-font-family: "Nunito Variable", -apple-system, "Segoe UI", Roboto, sans-serif`.

### 6.2 Navigation

```
IonApp
└─ IonReactRouter
   └─ IonSplitPane when="lg" (≥ 992 px)
      ├─ SideMenu (IonMenu, logo + Live/History/Settings)   — visible only ≥ 992 px
      └─ IonTabs
         ├─ IonRouterOutlet: /live, /history, /settings, / → /live
         └─ IonTabBar slot="bottom"                         — hidden ≥ 992 px via CSS
```

One route tree serves both layouts; only which navigation is visible changes. The side
menu is disabled (`IonMenu disabled`) below 992 px so no hamburger/swipe menu appears on
phones.

### 6.3 Splash screen

- `index.html` contains `<div id="splash">` with the inline MNEXT logo SVG,
  "Lectoraat Smart Energy" and "Avans · HZ" as muted text, plus its own inline CSS using
  the light/dark splash colours. It paints before any JavaScript loads.
- `splash.ts` exports `hideSplash()`. `main.tsx` calls it after the first React render;
  it waits until `performance.now() ≥ 5000` (time since navigation start), then adds a
  `.splash--hide` class (250 ms opacity transition) and removes the element on
  `transitionend`. With `prefers-reduced-motion: reduce` the element is removed without
  the transition.
- Because the 5 s is measured from navigation start, it overlaps with loading: a slow
  load adds nothing.
- The logo is animated with CSS keyframes (green strokes fly in, letters and subtitle fade in;
  see visual design §6); disabled with `prefers-reduced-motion`.
- The splash text is static HTML and not translated (it shows the organisation names).

### 6.4 Pages

Live, History and Settings render an `IonPage` with header and a translated placeholder
text ("Hier komt …"). Settings shows the app version (`__APP_VERSION__` defined by Vite
from `package.json`).

### 6.5 Internationalisation

- `i18n/index.ts` initialises i18next with `react-i18next`, bundled resources
  (`nl.json`), `lng: 'nl'`, `fallbackLng: 'nl'`, `interpolation.escapeValue: false`.
- Keys are grouped by area: `nav.*`, `live.*`, `history.*`, `settings.*`, `pwa.*`.
- No language detection or switch yet; adding English is adding `en.json` and a detector.
- A test checks that every key used in the code exists in `nl.json`
  (via a simple key-extraction over `src/**/*.tsx`).

### 6.6 Dev server

- `vite` listens on `0.0.0.0:5173` so the app can be opened from another device on the LAN
  (`http://<server-ip>:5173`).
- `server.proxy['/api'] → http://127.0.0.1:3000`.
- The service worker is **disabled in dev** (`devOptions.enabled: false`).

## 7. PWA

- `vite-plugin-pwa` with `registerType: 'prompt'` and `injectRegister: false`;
  registration via `virtual:pwa-register/react` in `UpdatePrompt.tsx`.
- Manifest exactly as in the visual design §5.3 (name, short_name, lang, colours,
  `display: standalone`), plus the generated icons.
- Workbox: precache the app shell (`**/*.{js,css,html,svg,png,woff2}`),
  `navigateFallback: 'index.html'`, `navigateFallbackDenylist: [/^\/api\//]`.
  No runtime caching of API calls yet (comes with the data features).
- `UpdatePrompt` shows an `IonToast` "Nieuwe versie beschikbaar" with a "Vernieuwen"
  button when a new service worker is waiting.
- Icons: `@vite-pwa/assets-generator` with `public/brand/mnext-logo.svg` as source,
  preset `minimal-2023` adjusted for: white background, 15 % padding (`any`),
  maskable with 20 % safe-zone padding, apple-touch-icon 180 px. Generated files are
  committed (so builds don't depend on the generator).
- `theme-color` meta tags for light (`#293D66`) and dark (`#161D29`).
- **Testing installability:** service workers require a secure context. Plain
  `http://<server-ip>` is not one, so installability is checked through an SSH tunnel:
  `ssh -L 4173:localhost:4173 arno@<server>` + `pnpm --filter web preview`, then open
  `http://localhost:4173` (localhost counts as secure) and run Lighthouse / the browser's
  install prompt.

## 8. API

- `config.ts` — zod schema over `process.env`:

  | Variable    | Default       | Note                                                                |
  | ----------- | ------------- | ------------------------------------------------------------------- |
  | `NODE_ENV`  | `development` | `production` enables static serving                                 |
  | `API_HOST`  | `127.0.0.1`   |                                                                     |
  | `API_PORT`  | `3000`        |                                                                     |
  | `LOG_LEVEL` | `info`        |                                                                     |
  | `WEB_DIST`  | `../web/dist` | path to the built web app                                           |
  | `INFLUX_*`  | —             | present in `.env.example`, **not** validated until the data feature |

  Invalid config → clear error message listing the bad variables, exit code 1.

- `server.ts` — `buildServer(config)` returns a Fastify instance (no `listen`), so tests
  use `app.inject()`:
  - logger: pino; `pino-pretty` transport only in development;
  - `@fastify/helmet` with a CSP allowing only `'self'` (plus `data:` for images);
  - routes under `/api/v1`;
  - in production: `@fastify/static` serves `WEB_DIST`; unknown non-`/api` GET requests
    return `index.html` (SPA fallback); unknown `/api` routes return JSON 404.
- `GET /api/v1/health` → `200 { "status": "ok", "version": "0.0.0", "uptimeSec": 12 }`
  (shape from `shared`'s `HealthResponse`). Influx readiness is added with the data feature.
- `.env` is loaded with Node's built-in `--env-file-if-exists=.env` (no dotenv dependency).

## 9. Code quality

### 9.1 ESLint (flat config, root `eslint.config.js`)

- `@eslint/js` recommended + `typescript-eslint` `recommendedTypeChecked` with
  `projectService: true`.
- Web files: `eslint-plugin-react-hooks` (recommended) and `eslint-plugin-react-refresh`.
- `eslint-config-prettier` last, so ESLint never fights Prettier.
- Ignores: `**/dist`, `**/dev-dist`, `coverage`, generated icons.

### 9.2 Prettier

`.prettierrc.json`: `{ "singleQuote": true, "printWidth": 100, "trailingComma": "all" }`.

### 9.3 Tests (Vitest)

Root `vitest.config.ts` with `projects` for the three packages:

| Package | Environment | First tests                                                                                                                   |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| shared  | node        | `API_BASE` constant / type guard                                                                                              |
| api     | node        | `GET /api/v1/health` via `inject`; invalid config is rejected                                                                 |
| web     | jsdom       | i18n keys used in code exist in `nl.json`; `LivePage` renders its title; `hideSplash` respects minimum duration (fake timers) |

## 10. Git hooks (Lefthook)

`lefthook.yml`:

- `pre-commit` (parallel, staged files only, `stage_fixed: true`):
  - `prettier --write {staged_files}`
  - `eslint --fix {staged_files}` for `*.{ts,tsx,js}`
- `commit-msg`: `commitlint --edit {1}`

`commitlint.config.js`: extends `@commitlint/config-conventional`, plus a local rule
requiring an issue reference `(#N)` at the end of the header. Merge commits are ignored
(commitlint's default ignores match `Merge …`). Allowed types: `feat`, `fix`, `docs`,
`style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Hooks can be skipped with `--no-verify` in an emergency; CI still runs everything.

## 11. CI (GitHub Actions)

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # version from packageManager
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- Actions are referenced by **commit SHA** (with the version as a comment) rather than
  by tag, so a moved tag cannot change what runs. The tags above are for readability.
- The job is named `ci`; that is the status-check name to make required on `main`
  later (separate change, after the first green run, with explicit OK).

## 12. Brand assets

- `apps/web/public/brand/mnext-logo.svg` and `mnext-logo-white.svg`, downloaded from
  `https://www.mnext.nl/app/themes/mnext/assets/img/logo.svg` / `logo_white.svg`,
  unmodified.
- `SOURCES.md` lists each file with source URL, download date and "use approved by
  product owner (2026-11-09)".
- Avans and HZ logos are not included yet (text on the splash, per visual design §10).

## 13. Updates to existing files

- `.env.example`: add `NODE_ENV`, `LOG_LEVEL`, `WEB_DIST` (no values).
- `.gitignore`: add `.lefthook-local.yml`.
- `README.md`: development section with `pnpm install`, `pnpm dev`, testing installability.
- `CLAUDE.md`: commands section (`pnpm dev/lint/typecheck/test/build`) and the
  TypeScript 6 / react-router 6 version constraints.

## 14. Open points

| #   | Topic                                        | Proposal                                                                                |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Favicon at 32 px with thicker strokes        | Use the plain SVG favicon now; revisit if it looks too thin                             |
| 2   | Upgrading to TypeScript 7 and react-router 7 | When typescript-eslint and `@ionic/react-router` support them; tracked as a chore issue |
