# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

P1-meter PWA: shows live and historical energy data (electricity import/export, gas)
for one household, read from an existing InfluxDB 2.x instance (bucket `p1-smartmeters`).

- TypeScript full-stack monorepo (pnpm workspaces):
  - `apps/web` — React + Vite + Ionic React (PWA; iOS style on iOS, Material on Android,
    full desktop layout with split pane)
  - `apps/api` — Node + Fastify backend-for-frontend (Flux queries, in-memory cache,
    rate limiting, live updates via SSE/WebSocket)
  - `packages/shared` — shared types and helpers
- Node version: see `.nvmrc` (managed with nvm). Package manager: pnpm.
- Architecture and design decisions live in `docs/design/`.

## Commands

- `pnpm dev` (api :3000 + web :5173), `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- Load Node first in non-interactive shells: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`
- Version constraints: TypeScript stays on 6.0.x (typescript-eslint supports < 6.1);
  react-router stays on 6.x (`@ionic/react-router` 9 requires < 7).
- Git hooks (lefthook): pre-commit formats/lints staged files and blocks real signatures;
  pre-push runs typecheck and tests. Load Node (nvm) before committing, or the hooks fail.
- New dependencies must pass `pnpm check:licenses` (permissive licenses only for anything
  shipped; no GPL/AGPL/LGPL). Do not commit generated `third-party-licenses.txt` files.
- pnpm refuses packages younger than 7 days (`minimumReleaseAge`); use major ranges
  (e.g. `vitest@5`) so pnpm picks the newest mature version. Install scripts are blocked
  unless listed under `allowBuilds` in `pnpm-workspace.yaml`.

## Language

- Respond to the user in **Dutch**.
- Code, code comments, commit messages, issues and documentation in **English**.

## Secrets

- Never commit secrets. `.env` is git-ignored; `.env.example` lists keys without values.
- The InfluxDB token is read-only and lives only in the backend, never in the browser.
- Never ask the user to paste a token or password into the conversation.
- Never suggest running commands that contain secrets via the `!` prefix: input and output
  of `!` commands end up in the conversation. Let the user run those in their own terminal.

## Ask first

Before any of the following, state exactly what you are going to do and wait for the
user's explicit OK:

- `git push`, merges, tags
- deployments
- any change on GitHub (issues, PRs, branch protection, settings)
- anything outside this project directory

Do not touch `~/Victron-Tibber-integration`, `~/CV-Analyse` or `~/victron-data`.
Do not use the home-assistant MCP server in this project.

## Feature workflow

1. Interview the user until the feature is fully clear.
2. Create a GitHub issue: goal, acceptance criteria, out of scope.
3. Write a design in `docs/design/YYYY-MM-DD-<topic>.md` (English).
4. Build only after the user approves the design.

## Git

- Commits are authored by the user only (local `user.name`/`user.email` in this repo).
  **No `Co-Authored-By` trailer or any other mention of Claude** in commits, PRs or tags.
- Conventional Commits with issue reference, e.g. `feat(api): add live endpoint (#12)`.
- Branching:
  - `feature/<issue>-<topic>` branched from `develop`
  - merge locally into `develop` with `--no-ff` (after OK), merge message contains `Closes #N`
  - `develop` → `main` only via pull request (after OK); the PR description lists the issues
  - version tags (`v0.1.0`, …) on `main`
- Branch protection:
  - `main`: PR required, 0 approvals, enforced for admins, no force-push, no deletion
  - `develop`: no force-push, no deletion

## Product rules

- A household is identified by its **signature** (Influx tag `signature`), e.g.
  `2019-ETI-EMON-V01-A1B2C3-000000`. The prefix (`2019-ETI-EMON-V01`) selects a device
  profile; the dynamic part is derived from a MAC address.
- Input: the prefix is prefilled, the user types only the dynamic part; case-insensitive,
  dashes optional; normalize to the canonical form.
- Public access, no login (deliberate). Therefore: never enumerate signatures, respond
  neutrally to unknown signatures, rate-limit to prevent guessing.
- One active signature and all settings are stored locally in the browser.
- Live: the latest value counts as live if it is less than 5 minutes old (kits send
  irregularly, with pauses up to ~2.5 min); otherwise show
  "no recent data" with its timestamp.
- Show gas only if the household has gas data.
