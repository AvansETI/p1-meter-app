# Live dashboard

- Issue: #6
- Status: **approved** (2026-11-09)
- Date: 2026-11-09
- Builds on: [architecture](2026-11-09-architecture.md) §7.1, §10, §11;
  [visual design](2026-11-09-visual-design.md) §3.3, §7.2; [EMON ID session](2026-11-09-emon-id-session.md)

## 1. Goal

The Live page shows what the household is using or feeding back right now, today's totals
and the last 24 hours, updated without reloading.

## 2. Data facts that shape the design

- **Simultaneous import and export.** On three-phase connections one phase can import while
  another exports. In the last 24 h, 35 of 93 reporting households had moments with both
  `power_consumed` > 0 and `power_produced` > 0 (≈ 7.5 % of all points). So we never assume
  one of them is zero: **net = consumed − produced**.
- **Send interval** is irregular: often every 10–20 s, but every household regularly pauses
  2–2.5 minutes. With a 60 s threshold working meters showed "no recent data" ~20 % of the
  time; with 5 minutes ~0.1 % (93 households, 2 hours, measured 2026-11-09). **Live = latest
  point < 5 minutes old** (product owner decision, replacing the original 60 s).
- **Counters** may be swapped per household; the API applies `importCounter` from the
  capabilities (#5) everywhere. The web app never sees raw field names.

## 3. Shared types

```ts
LiveSnapshot = {
  time: string;          // ISO, timestamp of the latest point
  ageSec: number;        // age of that point when the API sent it
  status: 'live' | 'stale' | 'offline';   // < 5 min, < 1 h, ≥ 1 h
  importKw: number;      // power_consumed
  exportKw: number;      // power_produced (0 without export)
  netKw: number;         // importKw − exportKw
}
TodayTotals = {
  since: string;         // ISO, local midnight Europe/Amsterdam
  importKwh: number;
  exportKwh?: number;    // only with export
  netKwh?: number;       // only with export
  gasM3?: number;        // only with gas
}
RecentSeries = {
  stepSec: 300;
  points: Array<{ t: string; netKw: number | null }>;   // null = no data (gap)
}
```

Thresholds (`LIVE_MAX_AGE_SEC = 300`, `OFFLINE_AFTER_SEC = 3600`) live in `shared`, so web
and API agree. The web app recomputes `status` as time passes between updates
(`ageSec` + seconds since receipt), so a stream that stops still turns "stale".

## 4. API

### 4.1 Routes (all need a session, §5.5 of #5)

| Route                     | Returns                                | Cache                        |
| ------------------------- | -------------------------------------- | ---------------------------- |
| `GET /api/v1/live`        | `LiveSnapshot`                         | 5 s (shared with the poller) |
| `GET /api/v1/live/stream` | SSE: `event: live` with `LiveSnapshot` | —                            |
| `GET /api/v1/live/today`  | `TodayTotals`                          | 60 s                         |
| `GET /api/v1/live/recent` | `RecentSeries` (last 24 h)             | 60 s                         |

`401 session_expired` without a valid session; `404 not_found` when the household has no
data in 30 days; `503 upstream_unavailable` when InfluxDB fails.

The SSE route takes the session as query parameter (`?session=…`), because `EventSource`
cannot send headers. The request serializer of the logger strips query strings, so session
IDs do not end up in logs.

### 4.2 Flux queries

**Latest values, many households at once (poller):**

```flux
from(bucket: B)
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature =~ /^(SIG1|SIG2|…)$/
                       and (r._field == "power_consumed" or r._field == "power_produced"))
  |> last()
```

A regex filter on the tag is pushed down to storage (unlike `contains()`). Signatures are
normalized (`[0-9A-Z-]` only), so they are safe inside the regex. At most 200 signatures per
query; more are split into batches.

When a household has no point in the last 10 minutes, a fallback query looks back 30 days
(`|> last()`, cached 60 s) to report when the latest point was.

**Today's totals (one household):**

```flux
from(bucket: B)
  |> range(start: <local midnight as UTC>)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == SIG
                       and (r._field == IMPORT_COUNTER or r._field == EXPORT_COUNTER
                            or r._field == "gas_delivered"))
  |> spread()
```

Local midnight is computed in TypeScript (`Intl`, `Europe/Amsterdam`, DST-aware) and passed
as an RFC 3339 timestamp. `spread` (max − min) of a counter is today's consumption. Energy
between the last point before midnight and the first after it (≤ one interval) is not
counted; acceptable. If the logger was offline across midnight, today starts at its first
point; the gap rule of the history feature does not apply to the live page.

**Last 24 hours (one household):**

```flux
from(bucket: B)
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "dsmr" and r.signature == SIG
                       and (r._field == "power_consumed" or r._field == "power_produced"))
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: true)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
```

Net per window = consumed − produced (produced treated as 0 when missing; window `null` when
consumed is missing).

### 4.3 Live poller

```
            subscribe(sig, listener)                 every 10 s, only if ≥ 1 subscriber
SSE route ───────────────────────────▶ LivePoller ───────────────────────────────────▶ InfluxDB
          ◀─── listener(snapshot) ────            ◀── latest values for all signatures ──
```

- `LivePoller` keeps `signature → Set<listener>`. Polling starts with the first subscriber
  and stops with the last. Each tick: one query (§4.2) for all subscribed signatures,
  snapshots into the 5 s cache, then each listener is called.
- A new subscriber immediately gets the cached snapshot (or a fresh query) so the page
  doesn't wait up to 10 s.
- InfluxDB errors are logged once per tick; subscribers keep their last snapshot and the
  client turns it "stale" by itself.

### 4.4 SSE details

- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
  `X-Accel-Buffering: no` (nginx), `Connection: keep-alive`.
- Implemented with `reply.hijack()` and `reply.raw.write`; unsubscribe on `close`.
- Heartbeat comment (`: ping`) every 25 s.
- `retry: 5000` so browsers reconnect after 5 s.
- Max 2 concurrent streams per session; a third gets `429`.
- Helmet's CSP already allows same-origin `connect-src` (default-src 'self').

## 5. Web app

### 5.1 Data fetching

- **TanStack Query** (`@tanstack/react-query` 5) for `today` and `recent`: caching per
  session, `refetchInterval: 60_000`, refetch on window focus, retry once. It will also
  serve the history feature.
- **`useLiveSnapshot()`** hook for the stream:
  - opens `EventSource('/api/v1/live/stream?session=…')`;
  - on a closed stream (e.g. `401` after an API restart) it calls `api.ensureSession()` and
    reconnects;
  - after 3 failed connections in a row it falls back to polling `GET /live` every 15 s and
    keeps trying SSE every minute;
  - a 1-second timer recomputes `status` from `ageSec` + time since receipt.
- The API client gets `getLive()`, `getToday()`, `getRecent()` and `streamUrl()`.

### 5.2 Live page layout (mobile; desktop puts tiles in a row and the chart full width)

```
┌─────────────────────────────┐
│ Live                        │
├─────────────────────────────┤
│ ● live · 12:04:31           │  status line (green dot / grey dot + warning colour)
│ ┌─────────────────────────┐ │
│ │ ▼ Van het net           │ │  net tile; ▲ "Terug aan het net" in green when net < 0
│ │   3,52 kW               │ │  48 px / 800, tabular numbers
│ └─────────────────────────┘ │
│ Vandaag                     │
│ ┌──────┐┌──────┐┌──────┐┌──────┐
│ │Afname││Terug ││Netto ││Gas   │   export + net only with export, gas only with gas
│ │12,4  ││ 3,1  ││ 9,3  ││0,68  │   kWh / kWh / kWh / m³
│ └──────┘└──────┘└──────┘└──────┘
│ Afgelopen 24 uur  (kW)      │
│ ▁▂▃▅▃▂▁▁▂▆▇▅▃ ───0─── ▔▔▂▁   │  area above 0 navy (import), below 0 green (export)
└─────────────────────────────┘
```

- **Stale** (5 min – 1 h): grey dot, "geen recente data · laatst 12:01", tile values muted.
- **Offline** (≥ 1 h): the tile is replaced by a notice:
  > **Je meter stuurt sinds 14 okt 15:38 geen gegevens.**
  > Controleer of de meterkit stroom heeft en of je wifi werkt. Helpt dat niet, haal dan
  > de voeding even los en sluit hem weer aan. _Meer hulp in de handleiding_ (wiki link).
  > "Vandaag" and the chart stay visible (they show what there is).
- Loading: skeleton tiles (`IonSkeletonText`); errors: inline message with retry button.

### 5.3 Formatting

`Intl.NumberFormat('nl-NL')`: power 2 decimals (`3,52 kW`), energy 1 decimal (`12,4 kWh`),
gas 2 decimals (`0,68 m³`); times `HH:mm:ss` today, otherwise `d MMM HH:mm`.
Net today is signed only when negative (`−2,1 kWh`).

### 5.4 Chart (ECharts)

- `echarts` 6 with tree-shaken imports (`echarts/core`, `LineChart`, `GridComponent`,
  `TooltipComponent`, `SVGRenderer`) — SVG renderer for crisp lines and smaller bundle.
- Series: two areas — import (net clipped to ≥ 0, `--app-data-import`) and export (net clipped
  to ≤ 0, `--app-data-export`, only with export); `connectNulls: false`. (Changed during
  implementation: a piecewise `visualMap` with open-ended pieces crashes ECharts 6.1 —
  "reading 'coord'" in `getVisualGradient`. A render test in node guards against regressions.)
- Colours and text colours read from CSS variables at render time and re-applied when the
  theme changes.
- Lazy-loaded (`React.lazy`) so ECharts is not in the initial bundle.
- Tooltip: time + "3,52 kW van het net" / "1,20 kW terug".
- Without export the y-axis minimum is 0.

## 6. Testing

| Area   | Tests                                                                                                                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shared | status from age (live/stale/offline boundaries); net calculation                                                                                                                                                                                                                                |
| api    | local-midnight computation incl. DST days; today totals with as-named and swapped counters, without export/gas; recent series net and gaps; poller: starts/stops with subscribers, one query for many, immediate snapshot; SSE route: headers, first event, 401 without session, 2-stream limit |
| web    | `useLiveSnapshot` status ageing with fake timers; Live page renders net import/export, hides export and gas when absent, shows offline notice                                                                                                                                                   |

Manual: real InfluxDB with a household with export (watch the tile flip sign around sunny
moments in the 24 h chart) and one without export.

## 7. Dependencies

| Package                 | Where | Version                    |
| ----------------------- | ----- | -------------------------- |
| `echarts`               | web   | ^6.1                       |
| `@tanstack/react-query` | web   | ^5 (newest mature release) |

## 8. Open points

| #   | Topic                                  | Proposal                                                                             |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Poller with very many concurrent users | Batches of 200; revisit with Redis/pub-sub if multiple API instances are ever needed |
| 2   | Clock skew between client and server   | Status uses the server's `ageSec`, not the client clock                              |
