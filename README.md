# MNEXT Energiemeter

Progressive web app that shows live and historical energy data from a household's
P1 smart meter: electricity import and export, and gas where available.
Built for the MNEXT Lectoraat Smart Energy.

Data is read (read-only) from an existing InfluxDB 2.x instance through a small
backend-for-frontend; the browser never talks to InfluxDB directly.

## Design

See `docs/design/`:

- [Architecture](docs/design/2026-11-09-architecture.md)
- [Visual design (MNEXT house style)](docs/design/2026-11-09-visual-design.md)
- [Monorepo scaffolding](docs/design/2026-11-09-monorepo-scaffolding.md)

## Structure

| Path              | Contents                                                   |
| ----------------- | ---------------------------------------------------------- |
| `apps/web`        | React + Vite + Ionic React PWA                             |
| `apps/api`        | Fastify backend-for-frontend; serves the web build in prod |
| `packages/shared` | TypeScript types and helpers used by both                  |

## Development

Requirements: Node (version in `.nvmrc`, e.g. via nvm) and pnpm (version in `package.json`).

```sh
nvm use
pnpm install            # also installs the git hooks (lefthook)
cp .env.example .env    # optional; fill in locally, never commit .env
pnpm dev                # api on :3000, web on http://<host>:5173
```

| Command          | Does                                           |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | API (watch) + web dev server with `/api` proxy |
| `pnpm lint`      | ESLint                                         |
| `pnpm format`    | Prettier (write)                               |
| `pnpm typecheck` | TypeScript, all packages                       |
| `pnpm test`      | Vitest, all packages                           |
| `pnpm build`     | Production build of web and API                |
| `pnpm start`     | Run the built API, serving the built web app   |

### Testing the PWA (install, service worker)

Service workers need a secure context (HTTPS or `localhost`). From your own machine:

```sh
ssh -L 4173:localhost:4173 <user>@<dev-server>
# on the server:
pnpm build && pnpm --filter @p1/web preview
```

Then open <http://localhost:4173> locally and use the browser's install option or Lighthouse.

## Deployment

Merging into `main` deploys automatically to https://p1-meter.sendlab.nl; see the
[operations runbook](docs/operations.md).

## Commits

Conventional Commits with an issue reference, enforced by a commit-msg hook:
`feat(api): add live endpoint (#12)`.

## License

Copyright 2026 Arno Broeders.

Licensed under the [Apache License, Version 2.0](LICENSE): you may use, modify and
distribute this software freely, provided you keep the [NOTICE](NOTICE) file and credit the
author.

The MNEXT, Avans and HZ names and logos are trademarks of their owners and are **not**
covered by this license.

### Third-party licenses

All dependencies use permissive licenses. Each build writes `third-party-licenses.txt` with
the license and notice texts of the included packages (web: served at
`/third-party-licenses.txt` and linked from the About screen; API: `apps/api/dist/`).
`pnpm check:licenses` — also run in CI — fails when a dependency has a license outside the
allowlist in `scripts/licenses.mjs` (no GPL/AGPL/LGPL or unknown licenses in production).
