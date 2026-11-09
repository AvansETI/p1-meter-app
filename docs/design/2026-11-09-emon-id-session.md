# EMON ID entry and session

- Issue: #5
- Status: **draft — awaiting approval**
- Date: 2026-11-09
- Builds on: [architecture](2026-11-09-architecture.md) §5, §6, §8.1, §9;
  [visual design](2026-11-09-visual-design.md) §7.1

## 1. Goal

A household enters its EMON ID once; the app stores it locally, the API checks it against
InfluxDB without revealing which IDs exist, detects what data the household has, and opens
a session for the features that follow (live, history).

## 2. Background from the SmartMeter_DIY project

Source: <https://github.com/AvansETI/SmartMeter_DIY> (firmware, wiki), read 2026-11-09.

- **Where users find the ID.** During setup the kit opens the Wi-Fi network
  "ETI EMON config"; its portal shows "Your EMON ID: …". The wiki tells users to take a
  screenshot. To show it again: disconnect power, hold button **Sw1**, reconnect power,
  connect to "ETI EMON config". Users know it as **EMON ID**, so the app uses that term.
- **Structure.** `2019-ETI-EMON-V01-` + `ESP.getChipId()` (6 hex, from the MAC address) +
  `-` + `ESP.getFlashChipId()` (6 hex). Across all 349 V01 signatures there are only
  **7 distinct flash-chip IDs** (6 common ones). The guessable space is therefore about
  2²⁴ × 6 ≈ 10⁸, not 2⁴⁸.
- **Existing exposure.** The wiki points users to a public Grafana (`viewer`/`viewer`) that
  lists all signatures, and the README calls the data public. Our measures (no enumeration,
  neutral responses, rate limits) keep this app from adding exposure; they cannot protect
  data that is already listed elsewhere. This is outside our scope and is flagged to the
  product owner.
- **Swapped counters.** In 8 of 83 households `energy_consumed`/`energy_produced` are
  reversed (architecture §3.1). The product owner considers a meter wiring fault the most
  likely cause; we cannot fix it, so we **detect, correct and signal** it.

## 3. Scope

In: welcome screen and EMON ID input, normalization, InfluxDB access, session API,
capability detection (incl. counter orientation), rate limiting, masked logging, Settings
(change/remove ID, theme, meter information, About).

Out: live and history data, QR scanning, multiple households, other prefixes.

## 4. Shared package

### 4.1 Device profile

```ts
export const EMON_V01 = {
  prefix: '2019-ETI-EMON-V01',
  dynamicPattern: /^[0-9A-F]{12}$/, // chip ID + flash chip ID, without dashes
  measurement: 'dsmr',
  sampleIntervalSec: 20,
  liveMaxAgeSec: 60,
} as const;
```

### 4.2 Normalization

`normalizeEmonId(input: string): { ok: true; signature: string } | { ok: false }`

1. Trim; uppercase.
2. If the input starts with the prefix (user pasted the full ID), strip it.
3. Remove whitespace and dashes.
4. Must match `^[0-9A-F]{12}$`.
5. Result: `${prefix}-${d.slice(0, 6)}-${d.slice(6)}`.

`formatDynamicPart(signature)` returns `XXXXXX-XXXXXX` for display.
`maskSignature(signature)` returns `2019-ETI-EMON-V01-…-` + last 4 characters, for logs.

### 4.3 API types (zod schemas, shared by web and API)

```ts
SessionRequest   = { emonId: string }
Capabilities     = {
  hasGas: boolean;
  hasExport: boolean;
  importCounter: 'energy_consumed' | 'energy_produced';
  counterOrientation: 'as-named' | 'swapped' | 'unknown';
  lastSeen: string;        // ISO timestamp of the most recent point
}
SessionResponse  = { sessionId: string; signature: string; capabilities: Capabilities }
ErrorResponse    = { error: 'invalid_format' | 'not_found' | 'rate_limited'
                           | 'session_expired' | 'upstream_unavailable' }
```

`shared` gets `zod` as a dependency.

## 5. API

### 5.1 Configuration (additions)

| Variable                   | Default | Note                                                                                                                                             |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `INFLUX_URL`               | —       | required                                                                                                                                         |
| `INFLUX_ORG`               | —       | required                                                                                                                                         |
| `INFLUX_BUCKET`            | —       | required                                                                                                                                         |
| `INFLUX_TOKEN`             | —       | required, read-only; never logged                                                                                                                |
| `INFLUX_TIMEOUT_MS`        | `10000` | per query                                                                                                                                        |
| `TRUST_PROXY`              | `false` | `true`, a hop count or an IP/CIDR list; **must** be set behind the reverse proxy, otherwise every client shares the proxy's IP for rate limiting |
| `SESSION_TTL_HOURS`        | `24`    | sliding                                                                                                                                          |
| `RATE_LIMIT_PER_MINUTE`    | `120`   | all routes, per IP                                                                                                                               |
| `SESSION_LIMIT_PER_MINUTE` | `10`    | `POST /session`, per IP                                                                                                                          |
| `SESSION_LIMIT_PER_DAY`    | `50`    | `POST /session`, per IP                                                                                                                          |
| `FAILED_LOOKUPS_PER_HOUR`  | `5`     | `404`s per IP before a 1-hour lock-out                                                                                                           |

In `NODE_ENV=test` the Influx variables are optional (tests inject a fake data source).

### 5.2 Data source

```ts
interface HouseholdDataSource {
  detect(signature: string): Promise<Capabilities | null>; // null = no data in 30 days
  ping(): Promise<boolean>;
}
```

- `InfluxDataSource` uses `@influxdata/influxdb-client` (1.35, the official client for
  InfluxDB 2.x; in maintenance mode but stable and sufficient for Flux queries).
- InfluxDB OSS does not support parameterized Flux queries, so values are inlined:
  the signature only after normalization (charset `[0-9A-Z-]`, fixed length) and always
  through `JSON.stringify` as a Flux string literal; bucket from config.
- `FakeDataSource` for tests and local UI work without InfluxDB.

### 5.3 Capability detection

Two Flux queries over the last 30 days for one signature:

```flux
data = from(bucket: bucket)
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == sig)

// 1. last point, max of gas and export power
data |> filter(fn: (r) => r._field == "gas_delivered" or r._field == "power_produced"
                          or r._field == "power_consumed")
     |> reduce(identity: {max: 0.0, last: time(v: 0)}, fn: (r, accumulator) => ({
          max: if r._value > accumulator.max then r._value else accumulator.max,
          last: if r._time > accumulator.last then r._time else accumulator.last }))

// 2. per local day: point count, integral of power_consumed, spread of both counters
data |> filter(fn: (r) => r._field == "power_consumed")
     |> aggregateWindow(every: 1d, fn: (column, tables=<-) => tables |> integral(unit: 1h))
data |> filter(fn: (r) => r._field == "power_consumed")
     |> aggregateWindow(every: 1d, fn: count)
data |> filter(fn: (r) => r._field == "energy_consumed" or r._field == "energy_produced")
     |> aggregateWindow(every: 1d, fn: spread)
```

(Days use `Europe/Amsterdam`, architecture §7. The exact query shape may be merged during
implementation; the result is what matters.)

Rules:

- **No points** → `null` → API answers `404 not_found`.
- `hasGas` = max `gas_delivered` > 0; `hasExport` = max `power_produced` > 0.
- **Orientation vote** over complete days only: point count ≥ 95 % of 4320 (20 s
  interval) and integrated import ≥ 1 kWh. Per day, the counter whose delta is closer to
  the integral wins. Result:
  - ≥ 3 valid days and ≥ 80 % agree → `as-named` or `swapped`;
  - otherwise `unknown`, and `importCounter` falls back to `energy_consumed`.
- Unit-tested with synthetic daily values (as-named, swapped, mixed, no valid days).

### 5.4 Sessions

- In-memory `lru-cache`: `sessionId → signature`, max 10 000 entries, sliding TTL
  `SESSION_TTL_HOURS`. `sessionId` = 16 random bytes, base64url.
- Capabilities cached per signature for 24 h; "not found" cached for 5 minutes (limits
  Influx load from repeated attempts).
- Sessions are lost on restart; the web app silently creates a new one (§6.3).

### 5.5 Routes

| Route                          | Request            | Responses                                                                                                        |
| ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/session`         | `{ emonId }`       | `200 SessionResponse` · `400 invalid_format` · `404 not_found` · `429 rate_limited` · `503 upstream_unavailable` |
| `GET /api/v1/capabilities`     | header `X-Session` | `200 Capabilities` · `401 session_expired`                                                                       |
| `DELETE /api/v1/session`       | header `X-Session` | `204`                                                                                                            |
| `GET /api/v1/health` (changed) | —                  | adds `influx: 'ok' \| 'unavailable'` (ping, cached 30 s)                                                         |

Unknown and inactive IDs run the same queries, so the 404 has similar timing.

### 5.6 Rate limiting

- `@fastify/rate-limit` globally (`RATE_LIMIT_PER_MINUTE`) and stricter on
  `POST /session` (per minute and per day).
- Failed lookups: an `lru-cache` counter per IP (TTL 1 h). After
  `FAILED_LOOKUPS_PER_HOUR` 404s, `POST /session` from that IP returns `429` for an hour,
  without querying InfluxDB.
- `429` responses include `Retry-After`.
- Fastify `trustProxy` from `TRUST_PROXY`, so the client IP comes from `X-Forwarded-For`
  set by the reverse proxy.

### 5.7 Logging

- A pino serializer replaces any signature in log objects with `maskSignature()`;
  request bodies are never logged (Fastify default).
- Errors from InfluxDB are logged without the query text (it contains the signature).

## 6. Web app

### 6.1 Settings store

`localStorage` key `p1meter.settings`:

```json
{ "version": 1, "emonId": "2019-ETI-EMON-V01-A1B2C3-000000", "theme": "system" }
```

React context `SettingsProvider` + `useSettings()`. All reads/writes in try/catch; if storage
is unavailable the app works for the session only.

### 6.2 Routing

- No `emonId` → `/welcome` (full screen, no tabs or side menu).
- With `emonId` → existing tabs/split pane; `/welcome` redirects to `/live`.

### 6.3 API client

`apiClient` (fetch wrapper):

- `ensureSession()` — creates a session from the stored `emonId` when none is held in
  memory; concurrent callers share one request.
- On `401 session_expired` it recreates the session once and retries.
- Maps responses to typed results; network errors → `upstream_unavailable`.

### 6.4 Welcome screen (visual design §7.1)

- MNEXT logo, app name, one-line intro.
- Field "EMON ID" with the fixed prefix shown in front; `inputmode="text"`,
  `autocapitalize="characters"`, `autocomplete="off"`, `spellcheck="false"`. Live
  formatting to `XXXXXX-XXXXXX` while typing.
- Expandable help "Waar vind ik mijn EMON ID?":
  > Je EMON ID kreeg je te zien toen je de meterkit instelde via het wifi-netwerk
  > "ETI EMON config". Kwijt? Haal de voeding van de kit los, houd knop Sw1 ingedrukt en
  > sluit de voeding weer aan. Verbind daarna met "ETI EMON config": je EMON ID staat
  > op het scherm. Meer uitleg in de handleiding (link to the wiki).
- Button "Starten" → `POST /session` → store `emonId` → `/live`.
- Messages:

  | Case                         | Text                                                                                                                            |
  | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
  | invalid format (client-side) | "Een EMON ID bestaat uit 12 tekens (cijfers 0–9 en letters A–F)."                                                               |
  | `404`                        | "Voor dit EMON ID zijn geen gegevens gevonden. Controleer het ID; stuurt je meter net pas data, probeer het dan later opnieuw." |
  | `429`                        | "Te veel pogingen. Probeer het over een uur opnieuw."                                                                           |
  | `503` / network              | "De gegevens zijn nu niet bereikbaar. Probeer het later opnieuw."                                                               |

### 6.5 Settings page

| Section         | Content                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meter           | EMON ID (dynamic part); "Wijzigen" (modal with the welcome form); "Verwijderen" (confirmation alert → clear settings + session → `/welcome`)                                  |
| Meterinformatie | Gas: ja/nee · Teruglevering: ja/nee · Tellers: "normaal" / "omgewisseld, wordt automatisch gecorrigeerd" (+ explanation) / "nog niet vastgesteld" · Laatste meting: date/time |
| Weergave        | Thema: Systeem / Licht / Donker (segment)                                                                                                                                     |
| Over            | MNEXT logo, "Lectoraat Smart Energy", "Avans · HZ", "Arno Broeders", version, link to the SmartMeter_DIY project                                                              |

Swapped-counter explanation: "De tellers voor afname en teruglevering lijken bij jouw
meter omgewisseld (mogelijk een aansluitfout). De app corrigeert dit automatisch."

### 6.6 Theme override

- Switch from `dark.system.css` to Ionic's class-based palette (`dark.class.css`); the
  dark block in `theme/variables.css` moves from the media query to `:root.ion-palette-dark`.
- `public/theme-init.js` (a small external script, because the CSP forbids inline
  scripts) runs in `<head>` before first paint: reads the stored theme, resolves "system"
  via `matchMedia`, sets `ion-palette-dark` on `<html>`. The splash uses the same class,
  so a forced light/dark theme also applies to the splash.
- The app listens for system changes while the setting is "system".

## 7. Testing

| Area   | Tests                                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shared | normalization (case, dashes, spaces, pasted full ID, invalid), formatting, masking                                                                                                                                                    |
| api    | orientation vote (synthetic data); session route with `FakeDataSource`: 200 / 400 / 404 / lock-out 429 / 503; `X-Forwarded-For` respected with `TRUST_PROXY`; capabilities with valid/expired session; logs contain no full signature |
| web    | welcome form validation and error messages (mocked fetch); settings store; redirect to `/welcome` without ID; theme resolution                                                                                                        |

Manual: run against the real InfluxDB with the product owner's own EMON ID (never
committed), check orientation "swapped" is detected and the Settings page shows it.

## 8. Dependencies

| Package                       | Where  | Version             |
| ----------------------------- | ------ | ------------------- |
| `@influxdata/influxdb-client` | api    | ^1.35               |
| `@fastify/rate-limit`         | api    | ^11 (newest mature) |
| `lru-cache`                   | api    | ^11                 |
| `zod`                         | shared | ^4                  |

## 9. Open points

| #   | Topic                                    | Proposal                                                               |
| --- | ---------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Public Grafana lists all signatures      | Outside this app; product owner to raise with the platform maintainers |
| 2   | Which ingest pipeline runs in production | Ask the maintainers; detection works regardless                        |
| 3   | Distributed guessing (many IPs)          | Accepted risk for MVP; revisit with Redis-backed limits if abuse shows |
