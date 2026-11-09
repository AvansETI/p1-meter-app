# P1 Meter App

Progressive web app that shows live and historical energy data from a household's
P1 smart meter: electricity import and export, and gas where available.

Data is read (read-only) from an existing InfluxDB 2.x instance through a small
backend-for-frontend; the browser never talks to InfluxDB directly.

## Status

Early setup. See `docs/design/` for the architecture once it is approved.

## Stack

- `apps/web` — React, Vite, Ionic React (PWA)
- `apps/api` — Node, Fastify
- `packages/shared` — shared TypeScript code

## Development

Requirements: Node (version in `.nvmrc`, e.g. via nvm) and pnpm.

```sh
nvm use
cp .env.example .env   # fill in values locally, never commit .env
```

Further instructions follow once the apps exist.
