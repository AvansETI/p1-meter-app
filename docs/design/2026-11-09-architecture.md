# Architecture & design

- Issue: #1
- Status: **approved** (2026-11-09)
- Date: 2026-11-09
- Last updated: 2026-11-16 (version 0.15.1)

This document started as the MVP design. It is kept up to date as the overview of the whole
app; the feature designs in this folder hold the details (§1.1).

## 1. Purpose and scope

A progressive web app that shows one household's energy data from its P1 smart-meter
logger: live power, history (day/week/month/year) for electricity import and export,
and gas when the household has gas. Data is read from an existing InfluxDB 2.x instance.

In scope for the MVP: live dashboard, history and charts, export (via P1 only), gas
(conditional), local settings, installable PWA.

Out of scope for the MVP: costs and tariffs, comparing or viewing other households,
user accounts, inverter integrations, voltage/current/per-phase data.

### 1.1 Since the MVP

Added after the MVP, each with its own design:

| Feature                                                           | Design                                                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live dashboard, hourly gas chart                                  | [live dashboard](2026-11-09-live-dashboard.md), [gas chart](2026-11-09-gas-chart.md)                                                                  |
| History per day, week, month and year                             | [history](2026-11-09-history.md)                                                                                                                      |
| Day-ahead prices, tariffs per household, daily costs              | [costs](2026-11-09-costs.md)                                                                                                                          |
| Automatic deployment                                              | [deployment](2026-11-09-deployment.md)                                                                                                                |
| Dutch and English                                                 | [language](2026-11-12-language.md)                                                                                                                    |
| Automatic updates of the installed app                            | [auto-update](2026-11-14-auto-update.md)                                                                                                              |
| Anonymous usage statistics                                        | [usage stats](2026-11-14-usage-stats.md)                                                                                                              |
| Festive decorations in the title bar                              | [festive](2026-11-14-festive-decoration.md), [more seasons](2026-11-15-more-festive-seasons.md), [fuller scenes](2026-11-15-fuller-festive-scenes.md) |
| Gas analysis (degree days, forecast, comparison), shared settings | [gas analysis](2026-11-15-gas-analysis.md), [shared gas settings](2026-11-15-shared-gas-settings.md)                                                  |
| Release notes                                                     | [release notes](2026-11-15-release-notes.md)                                                                                                          |

Comparing with other households exists only in the gas analysis, as an anonymous
distribution with a minimum group size; no other household's data can be viewed.

## 2. Context and constraints

- InfluxDB 2.x (Flux), bucket `p1-smartmeters`, remote over HTTPS. The app only reads,
  with a read-only token that exists only in the backend.
- Many households; ~100 new users per year with high churn; data is kept forever.
- Public access through a reverse proxy, **no login** (deliberate). The signature is the
  only key to a household's data and its dynamic part is derived from a MAC address,
  so it is guessable. The design must not make guessing easy.
- Runs in a Proxmox LXC container (§14).

## 3. InfluxDB schema (observed 2026-11-09)

Findings from metadata queries over the whole bucket and from detailed queries on one
consenting household.

| Item             | Value                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Measurement      | `dsmr` (only one)                                                                                        |
| Tags             | `signature` (only one)                                                                                   |
| Fields           | `power_consumed`, `power_produced`, `energy_consumed`, `energy_produced`, `gas_delivered` — all `double` |
| Retention        | infinite, shard group 7 days                                                                             |
| Oldest data      | August 2023                                                                                              |
| Signatures       | 351 in total; ~90–100 reporting at any moment, 124 in the last 30 days                                   |
| Prefixes         | `2019-ETI-EMON-V01` (349), two single test/legacy devices with other prefixes                            |
| Signature length | always 31 characters: prefix + `-` + 6 hex + `-` + 6 hex                                                 |
| Sample interval  | ~20–33 s; varies per kit and over time (one kit: 20 s in Feb, ~33 s in Oct 2026)                         |
| Ingest latency   | of 91 reporting households, 90 had a last point < 30 s old, 1 between 30–60 s                            |

Units and semantics:

| Field             | Unit | Kind               | Notes                                               |
| ----------------- | ---- | ------------------ | --------------------------------------------------- |
| `power_consumed`  | kW   | instantaneous      | import from grid; resolution 0.01 kW                |
| `power_produced`  | kW   | instantaneous      | export to grid                                      |
| `energy_consumed` | kWh  | cumulative counter | sum over tariffs; **orientation varies, see below** |
| `energy_produced` | kWh  | cumulative counter | sum over tariffs; **orientation varies, see below** |
| `gas_delivered`   | m³   | cumulative counter | updates every 5 min (DSMR 5) or hourly (DSMR ≤ 4)   |

### 3.1 Per-household differences

Every signature has written all five fields at some point, so field _presence_ says
nothing. Differences are in the _values_:

- **Gas.** In the last 30 days 103 of 121 households had `gas_delivered > 0`; the rest
  always report 0 (no gas connection or no gas meter linked).
- **Export.** 94 households have `energy_produced > 0`, but only 76 had
  `power_produced > 0` in the last 30 days. A non-zero export counter therefore does not
  mean the household currently exports.
- **Swapped energy counters.** Comparing the daily integral of `power_consumed` with the
  daily delta of both counters (83 households, 2026-10-01): in **75** households
  `energy_consumed` is the import counter (as named); in **8** households it is the
  other way round. The `power_*` fields were consistent everywhere. Cross-checking with
  gas update frequency showed this is _not_ explained by DSMR generation (5 swapped
  households have a DSMR 5 meter). Cause unknown; it must be detected per household.
- **Gaps.** Loggers go offline for days or weeks. Counters keep running on the meter,
  so after a gap the first value includes everything consumed during the gap.
  Counters never decreased in the sampled household (no resets observed).

### 3.2 Not available

No voltage, current, per-phase power or per-tariff counters exist in the bucket, even for
households with DSMR 5 meters: the V01 firmware only forwards the five fields above.
A future firmware is expected to use a new prefix; the device-profile mechanism (§6)
is where such fields would be added.

## 4. Architecture overview

```
 Browser (PWA)                                 LXC container                      remote
┌────────────────────┐   HTTPS   ┌──────────────┐  HTTP  ┌───────────────────────┐  HTTPS  ┌──────────────────────┐
│ apps/web           │──────────▶│ reverse proxy│──────▶│ apps/api (Fastify)    │────────▶│ InfluxDB 2.x         │
│ React+Ionic+Vite   │◀── SSE ───│ (TLS)        │◀──────│ - static web files    │  Flux   │ p1-smartmeters (ro)  │
│ service worker     │           └──────────────┘        │ - REST + SSE          │         │ prices (rw)          │
│ localStorage       │                                    │ - cache, rate limit   │         │ open data (rw)       │
└────────────────────┘                                    │ - live poller         │         └──────────────────────┘
                                                          │ - price + open-data   │  HTTPS  ┌──────────────────────┐
                                                          │   jobs                │────────▶│ ENTSO-E, EnergyZero, │
                                                          │ - SQLite (p1.db)      │         │ KNMI, CBS            │
                                                          └───────────────────────┘         └──────────────────────┘
```

The household data in `p1-smartmeters` is only read. The API writes only to its own buckets
(prices, cached public data) and to its SQLite database (§8.3).

Monorepo (pnpm workspaces):

| Package           | Responsibility                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | UI, routing, charts, PWA (service worker, manifest), local settings, translations, release notes                                          |
| `apps/api`        | HTTP API, SSE, Flux queries, capability detection, caching, rate limiting, costs, gas analysis, background jobs; serves the built web app |
| `packages/shared` | API types and schemas (zod), signature normalization, device profiles, unit helpers, cost and gas calculations                            |

The API serves the static web build itself (`@fastify/static`), so production is one
Node process behind the proxy. Same origin means no CORS configuration.

## 5. Signatures

### 5.1 Input and normalization

- The UI shows the prefix of the default device profile (`2019-ETI-EMON-V01`) as a fixed
  label; the user types only the dynamic part.
- Accepted input: case-insensitive, dashes and spaces optional, e.g. `a1b2c3000000`,
  `A1B2C3-000000`, `a1b2 c300 0000`.
- Normalization (in `packages/shared`, used by web and api):
  remove whitespace and dashes → uppercase → must match `^[0-9A-F]{12}$` →
  format `XXXXXX-XXXXXX` → prepend `<prefix>-`.
- Invalid format is rejected client-side and server-side with a validation error
  (this reveals nothing about existence).

Example (fictional): `a1b2c3000000` → `2019-ETI-EMON-V01-A1B2C3-000000`.

### 5.2 Not leaking which signatures exist

- No endpoint lists signatures or prefixes from the database.
- The signature is never put in a URL path or query string (those end up in proxy
  logs and browser history). It is sent once in a POST body to open a session (§8.1).
- An unknown signature and a known signature without data in the last 30 days get
  the **same** response ("no data found for this code") with similar timing.
- Server logs never contain a full signature; they log a masked form
  (`2019-ETI-EMON-V01-…-0000`-style, last 4 characters only).
- Rate limiting (§9) makes brute-forcing the 48-bit dynamic part impractical; the
  MAC-derived half is guessable, so limits are on _attempts_, not on the search space.

## 6. Device profiles and capabilities

### 6.1 Device profile (static, per prefix)

Defined in code in `packages/shared`. One profile for now:

```ts
// illustrative
const EMON_V01: DeviceProfile = {
  prefix: '2019-ETI-EMON-V01',
  measurement: 'dsmr',
  sampleIntervalSec: 20,
  liveMaxAgeSec: 300,
  fields: {
    powerImport: 'power_consumed', // kW
    powerExport: 'power_produced', // kW
    counterA: 'energy_consumed', // kWh, orientation detected per household
    counterB: 'energy_produced', // kWh
    gas: 'gas_delivered', // m³
  },
};
```

Unknown prefixes are rejected as invalid input. Supporting the two other existing
prefixes is an open question (§15).

### 6.2 Capabilities (detected per household, cached)

Computed by the API on session start and cached for 24 h:

| Capability      | Rule                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasData`       | any point in the last 30 days                                                                                                                                   |
| `hasGas`        | `max(gas_delivered) > 0` over the last 30 days                                                                                                                  |
| `hasExport`     | `max(power_produced) > 0` over the last 30 days                                                                                                                 |
| `importCounter` | `energy_consumed` or `energy_produced` — whichever daily delta is closest to `integral(power_consumed)` over the most recent days with complete data (see §7.4) |

If orientation cannot be determined (e.g. near-zero consumption, too little data), fall
back to "as named" and mark the result as uncertain in the API response.

The web app only shows sections for capabilities that are present (e.g. no gas tab
without `hasGas`). Future fields (voltage, current) become new capabilities.

## 7. Flux queries

All queries are built in `apps/api` from parameterized templates. The signature is
always passed as a validated, normalized value — never concatenated from raw input.
All calendar calculations use `Europe/Amsterdam` so days, weeks, months and years
follow local time, including DST changes:

```flux
import "timezone"
option location = timezone.location(name: "Europe/Amsterdam")
```

### 7.1 Live (latest values)

```flux
from(bucket: "p1-smartmeters")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == sig)
  |> last()
```

Returns the latest value per field with its timestamp. The API decides `live` when
`now - _time < liveMaxAgeSec`; otherwise the client shows "no recent data" with the
timestamp of the most recent point (looked up with `range(start: -30d) |> last()` when
the 2-minute window is empty, cached).

### 7.2 Power chart (instantaneous)

```flux
from(bucket: "p1-smartmeters")
  |> range(start: start, stop: stop)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == sig
                       and (r._field == "power_consumed" or r._field == "power_produced"))
  |> aggregateWindow(every: window, fn: mean, createEmpty: true)
```

| Period | Window | Points |
| ------ | ------ | ------ |
| day    | 1 m    | 1440   |
| week   | 15 m   | 672    |
| month  | 1 h    | ~730   |
| year   | 1 d    | 365    |

`createEmpty: true` makes gaps visible as nulls (shown as breaks in the line).

### 7.3 Energy and gas totals (from counters)

```flux
from(bucket: "p1-smartmeters")
  |> range(start: start - window, stop: stop)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == sig
                       and (r._field == importCounter or r._field == exportCounter
                            or r._field == "gas_delivered"))
  |> aggregateWindow(every: window, fn: last, createEmpty: true)
  |> difference(nonNegative: true)
```

| Period | Bars        |
| ------ | ----------- |
| day    | 24 × hour   |
| week   | 7 × day     |
| month  | 28–31 × day |
| year   | 12 × month  |

Totals come from counter differences, not from integrating power, because counters
are exact even across gaps.

### 7.4 Gaps

With `createEmpty: true` an offline window has a null last value. Post-processing in
the API (not in Flux, to keep queries simple):

- a bucket whose own last value is null → `null` (no data);
- the first bucket after one or more null buckets carries the whole delta of the gap
  → returned as one value flagged `spansGap: true` with `gapStart`.

The UI shows such a value as one block labelled "not broken down" (Dutch UI text TBD)
instead of attributing it to a single hour/day or showing zeros.

### 7.5 Capability detection

```flux
data = from(bucket: "p1-smartmeters")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == sig)

data |> filter(fn: (r) => r._field == "gas_delivered" or r._field == "power_produced")
     |> max()

// orientation: per day, compare integral(power_consumed) [kWh] with each counter's delta
data |> filter(fn: (r) => r._field == "power_consumed")
     |> aggregateWindow(every: 1d, fn: (column, tables=<-) => tables |> integral(unit: 1h))
data |> filter(fn: (r) => r._field == "energy_consumed" or r._field == "energy_produced")
     |> aggregateWindow(every: 1d, fn: spread)
```

Only days where the logger was online all day (point count ≥ 95 % of expected) are
used for the orientation vote.

## 8. HTTP API

Base path `/api/v1`. JSON. Request/response schemas live in `packages/shared` (zod)
and are validated on both sides.

### 8.1 Sessions

`POST /api/v1/session` — body `{ "signature": "<dynamic part or full signature>" }`

- Normalizes and validates; looks up capabilities.
- Found: `200 { sessionId, signature, capabilities, lastSeen }`.
- Not found / no data in 30 days: `404 { error: "not_found" }` (same body for both).
- `sessionId` is a random opaque 128-bit token, kept in an in-memory map
  (`sessionId → signature`) with a sliding TTL of 24 h. It is used in all other calls
  (header `X-Session` for REST, query parameter for SSE because `EventSource` cannot
  set headers). It is not a secret worth protecting more than the signature itself;
  its purpose is to keep the signature out of URLs and to rate-limit lookups at one
  place. After an API restart the web app silently creates a new session using the
  locally stored signature.

`DELETE /api/v1/session` ends a session.

### 8.2 Data

All routes except `/health` and `/stats` need a session.

| Method & path                                          | Returns                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `GET /live`                                            | latest values, `live: boolean`, `time`                                     |
| `GET /live/stream?session=…`                           | SSE stream of live values (§10)                                            |
| `GET /live/recent`, `/live/today`, `/live/gas`         | the Live page: recent power, today's totals, today's gas per hour          |
| `GET /history?period=week&date=2026-11-09`             | import/export/gas buckets with gap flags (§7.3), with costs when available |
| `GET /costs/today`, `/costs/days?from=…&to=…`          | costs per day ([costs](2026-11-09-costs.md))                               |
| `GET`/`PUT /tariffs`, `GET /tariffs/versions`          | the household's tariffs and their versions                                 |
| `GET /gas/analysis`, `/gas/hourly`, `/gas/comparison`  | the gas analysis ([gas analysis](2026-11-15-gas-analysis.md))              |
| `GET`/`PUT /gas/settings`, `PUT`/`DELETE /gas/profile` | shared gas settings and the anonymous comparison profile                   |
| `GET /capabilities`                                    | capabilities (§6.2)                                                        |
| `GET /health`                                          | status, version and the state of InfluxDB, prices and open data            |
| `GET /stats`                                           | anonymous usage counts ([usage stats](2026-11-14-usage-stats.md))          |

Paths are relative to `/api/v1`. `period` ∈ `day|week|month|year`; `date` is any date inside the
period (local time); weeks start on Monday (ISO). Every response carries the app version in the
`x-app-version` header (§12).

The separate power-series endpoint planned for the MVP (§7.2) was not built: the Live page shows
recent power, History shows energy per bucket.

### 8.3 Server-side state

Next to InfluxDB the API keeps a SQLite database (`node:sqlite`), `p1.db` in `DATA_DIR`
(systemd's `StateDirectory` in production), with numbered migrations and a daily backup in
`backups/`. Households are keyed by an HMAC hash of the signature, never by the signature itself.

| Tables                                          | Holds                                                     |
| ----------------------------------------------- | --------------------------------------------------------- |
| `tariff_sets`, `tariff_versions`, `daily_costs` | tariffs per household with their history, and daily costs |
| `app_usage`, `app_meta`                         | the last day of use per hashed household                  |
| `weather_stations`, `gas_reference`             | KNMI stations and reference figures for the gas analysis  |
| `gas_profiles`, `gas_locations`, `gas_day_ends` | the anonymous comparison and daily meter readings for gas |
| `gas_settings`                                  | the household's shared gas analysis settings              |

This is the only state that survives a restart; sessions, caches and rate limits stay in memory.

### 8.4 Background jobs

- **Prices:** day-ahead electricity (ENTSO-E) and gas (EnergyZero) prices, fetched at most hourly
  with backoff, stored in the prices bucket. Runs only when its tokens are set.
- **Open data:** KNMI weather and CBS figures for the gas analysis, cached in the open-data bucket
  (in memory without one).

## 9. Caching and rate limiting

### 9.1 Cache

In-memory LRU cache (`lru-cache`) behind a small `Cache` interface, so a Redis
implementation can be added later without touching callers.

| Data                              | Key                        | TTL                               |
| --------------------------------- | -------------------------- | --------------------------------- |
| live values                       | signature                  | 5 s (shared with the live poller) |
| capabilities                      | signature                  | 24 h                              |
| history, period contains "now"    | signature + query + period | 60 s                              |
| history, period fully in the past | signature + query + period | 24 h                              |
| last-seen for offline households  | signature                  | 60 s                              |

In-flight deduplication: concurrent identical queries share one Influx request.
Memory bound: max entries and max total size configured via env.

### 9.2 Rate limiting

`@fastify/rate-limit` with `trustProxy` configured for the reverse proxy:

| Scope                                 | Limit (initial, configurable)       |
| ------------------------------------- | ----------------------------------- |
| all API routes, per IP                | 120 requests / minute               |
| `POST /session`, per IP               | 10 / minute and 50 / day            |
| `POST /session` returning 404, per IP | 5 / hour; afterwards 429 for 1 hour |
| SSE connections per session           | 2 concurrent                        |

Limits reset on restart (in-memory); acceptable for MVP, Redis later if needed.

## 10. Live updates

- **SSE** rather than WebSocket: one-way data, plain HTTP through the proxy, built-in
  reconnect in `EventSource`.
- The API runs **one poller** for all signatures that currently have an open stream.
  Every 10 s it runs one Flux query (§7.1, filtered on the set of active signatures),
  updates the live cache and pushes a `live` event to each subscriber.
  Influx load is independent of the number of open browser tabs.
- Heartbeat comment every 25 s to keep proxies from closing idle connections. The web app shows
  this as the slowly beating live dot.
- On connect the stream sends a `version` event with the app version, because `EventSource`
  cannot read response headers (§12).
- The client marks data stale when the latest point is older than 5 minutes and falls back to
  polling `GET /live` if SSE fails repeatedly.
- The reverse proxy must not buffer SSE (`X-Accel-Buffering: no` / proxy setting).

## 11. Web app

### 11.1 Structure

- **Welcome** (no signature stored): explanation, input for the dynamic part.
- **Live**: current import/export power (big number + direction), recent power chart,
  today's import, export, gas and costs so far, hourly gas chart, freshness indicator
  ("live" / "no recent data since …").
- **History**: period switcher day/week/month/year with previous/next; electricity, gas
  and cost bar charts; gap blocks marked.
- **Gas analysis** (only with gas): degree days, heating line, forecast and comparison.
- **Settings**: signature, language, theme, tariffs, gas analysis settings, and About
  (version, release notes, licenses).
- **About**: its own item in the desktop side menu; on mobile it stays in Settings.

All texts are in Dutch and English (`i18n/nl.json`, `i18n/en.json`). The title bar carries
festive decorations by date.

### 11.2 Platform-adaptive UI

- Ionic React with adaptive `mode`: iOS style on iOS, Material on Android/other.
- Mobile: tab bar (Live, History, Gas analysis when present, Settings).
- Desktop (≥ 992 px): `IonSplitPane` with a side menu and wider dashboard layout
  (multiple charts side by side).

### 11.3 Charts

**Apache ECharts** (tree-shaken import, SVG renderer) — good touch support, handles
null gaps and mixed bar/line well, themeable for light/dark.

- One instance per chart for the component's lifetime (`useEChart`); colours follow the
  theme tokens.
- No intro animation: Safari on iOS sometimes left an animated chart empty (#26).
- Every chart shows the same dashed vertical hairline that follows the finger or mouse
  (`live/hairline.ts`, #85). Charts that show one value per category use an axis tooltip;
  the heating-line scatter keeps a tooltip per day with the hairline on its x-axis.

### 11.4 Local storage

`localStorage` key `p1meter.settings` with `{ signature, theme, language, gas, ... }`.
Nothing else is persisted client-side except the service worker cache and a marker for the
"updated to version X" toast. Removing the signature clears cached API data as well.

The gas analysis settings (except on/off) are also stored on the server per household, so
all devices share them; last write wins
([shared gas settings](2026-11-15-shared-gas-settings.md)).

## 12. PWA and offline

- `vite-plugin-pwa` (Workbox), manifest with icons, `display: standalone`.
- App shell precached; the app opens offline.
- History responses: stale-while-revalidate in the service worker, max age 7 days;
  offline the UI shows the cached data with an "offline — data from …" banner.
- Live data is never served from cache; offline shows "offline".
- Update flow: automatic ([auto-update](2026-11-14-auto-update.md)). The client compares
  the version in the `x-app-version` header and the SSE `version` event with its own and
  then checks for a new service worker (at most once a minute). A new version installs and
  reloads behind the splash screen, which says "Updating…", followed by an
  "updated to version X" toast.

## 13. Security summary

- Influx token: read-only, only in the API's environment (`INFLUX_TOKEN`), never sent
  to the browser, never logged.
- Flux injection: only normalized signatures (`^[A-Z0-9-]{31}$`) and whitelisted
  periods/fields reach query templates.
- No enumeration, neutral 404, masked logging, rate limits (§5.2, §9.2).
- Security headers via `@fastify/helmet` (CSP allowing only same-origin).
- HTTPS terminated at the reverse proxy; API listens on localhost/private network only.

## 14. Deployment (LXC)

Target: unprivileged Proxmox LXC container, Debian or Ubuntu LTS.

- Node: same major as `.nvmrc`, installed for a dedicated system user `p1meter`.
- Layout: `/opt/p1-meter-app/releases/<version>/`, symlink `current`.
- Config: `/etc/p1-meter-app/env` (mode 600, owner `p1meter`) with the variables from
  `.env.example`.
- Process: systemd unit `p1-meter-app.service` running `apps/api` (which serves the
  web build), restart on failure, hardening options (`NoNewPrivileges`,
  `ProtectSystem=strict`, …).
- Release: pull-based ([deployment](2026-11-09-deployment.md)). A merge into `main`
  makes CI publish a package to the `main-latest` pre-release; a systemd timer on the LXC
  checks every 2 minutes, installs it, restarts the service and checks `/api/v1/health`,
  with an automatic rollback when it is unhealthy. No deploy keys or inbound access.
- Reverse proxy: `https://p1-meter.sendlab.nl` → `10.0.0.51` (TLS) → LXC port 8080, SSE
  buffering disabled.
- Logs: journald (pino JSON).

The runbook is [docs/operations.md](../operations.md).

## 15. Open questions and decisions

| #   | Topic                                                     | Proposal                                                                                       |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Swapped energy counters                                   | Auto-detect per household (§6.2). Cause unknown.                                               |
| 2   | Gaps                                                      | One "not broken down" block (§7.4). Accepted 2026-11-09.                                       |
| 3   | Other prefixes (`2005-POK-EMON-V00`, `DIY-SMARTMETER-V2`) | Not supported in MVP.                                                                          |
| 4   | Future fields (voltage, current, per phase)               | Not in MVP; add via device profile + capability.                                               |
| 5   | Neutral response vs. helpful UX                           | Same 404 for unknown and inactive (> 30 days) signatures.                                      |
| 6   | Chart library                                             | ECharts. Decided.                                                                              |
| 7   | Reverse proxy and hostname                                | `p1-meter.sendlab.nl` via `10.0.0.51`. Decided (§14).                                          |
| 8   | Dev without live data                                     | Optional replay data source that replays history as live.                                      |
| 9   | Native apps (Google Play, App Store), nice to have — #4   | Capacitor around `apps/web`; requires a configurable API base URL and CORS for the app origin. |

## 16. Glossary

| Term           | Meaning                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| P1 port        | Customer port on a Dutch/Belgian smart meter that outputs DSMR telegrams.                         |
| DSMR           | Dutch Smart Meter Requirements; versions ≤ 4 and 5 differ in update rates.                        |
| Logger         | The device on the P1 port that sends data to InfluxDB.                                            |
| Signature      | Unique ID of a logger/household, the Influx tag `signature`.                                      |
| Prefix         | Fixed first part of a signature identifying device type and firmware, e.g. `2019-ETI-EMON-V01`.   |
| Dynamic part   | The last 12 hex characters (`XXXXXX-XXXXXX`), MAC-derived.                                        |
| Device profile | Static description of fields, units and processing for one prefix.                                |
| Capability     | Per-household property detected from data (has gas, has export, …).                               |
| Import         | Electricity taken from the grid (Dutch: _afname_).                                                |
| Export         | Electricity fed back into the grid (Dutch: _teruglevering_).                                      |
| Counter        | Cumulative meter reading (kWh or m³) that only increases.                                         |
| Live           | Latest value is less than 5 minutes old (changed from 60 s on 2026-11-09, see live dashboard §2). |
| Gap            | Period in which the logger sent no data.                                                          |
| BFF            | Backend-for-frontend: an API shaped for this app's UI.                                            |
| SSE            | Server-Sent Events: one-way HTTP stream from server to browser.                                   |
| PWA            | Progressive web app: installable web app with a service worker.                                   |
| Flux           | InfluxDB 2.x query language.                                                                      |
| LXC            | Linux container on Proxmox, the deployment target.                                                |
