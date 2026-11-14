# Usage statistics in Settings → About

- Issue: #63
- Status: **approved** (2026-11-14)
- Date: 2026-11-14
- Builds on: [architecture](2026-11-09-architecture.md), [costs](2026-11-09-costs.md) §5 (SQLite)

## 1. Goal

Show two numbers under the version in Settings → About:

- **Active users**: the number of distinct emon IDs (signatures) whose household used the
  app in the last 30 days.
- **Active installations**: the number of distinct meter kits (signatures) that sent data
  to InfluxDB in the last 30 days, whether or not anyone uses the app for them.

```
Arno Broeders
Versie 0.10.0
23 actieve gebruikers · 41 actieve meterkits (laatste 30 dagen)
Meer over de meterkit
…
```

## 2. Decisions

| Topic               | Decision                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Active user         | A known signature that opened a session or fetched data (live, history, costs, …) in 30 days   |
| Unknown IDs         | Never counted: only signatures that passed the existing lookup                                 |
| Storage             | Table `app_usage` in the existing SQLite database: salted hash + last day of use, no signature |
| Retention           | Rows older than 30 days are deleted (hourly maintenance)                                       |
| Active installation | Every signature with data in the bucket in the last 30 days, all prefixes (V01 and later V02)  |
| Endpoint            | `GET /api/v1/stats`, public (aggregate numbers only), normal rate limit                        |
| Caching             | Installations cached 1 hour (one Flux query); users counted from SQLite, cached 5 minutes      |
| Start of counting   | Counting starts at deployment; until 30 days have passed the app shows "since <date>"          |
| Failure             | No numbers shown when the endpoint fails; the rest of About is unaffected                      |

## 3. Recording use (API)

`usage/tracker.ts`:

```ts
export class UsageTracker {
  constructor(db: DatabaseSync, salt: string);
  /** Records that a household used the app today; at most one write per signature per day. */
  record(signature: string, now?: Date): void;
  /** Distinct households seen in the last `days` days. */
  activeUsers(days: number, now?: Date): number;
  /** The first day anything was recorded (ISO date), or null. */
  since(): string | null;
  /** Deletes rows older than `days` days. */
  prune(days: number, now?: Date): void;
}
```

- Migration 5:
  `CREATE TABLE app_usage (hash TEXT PRIMARY KEY, last_day TEXT NOT NULL);`
  `CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`
- `hash = HMAC-SHA256(salt, signature)` (hex). The salt is 32 random bytes generated on first
  start and stored in `app_meta` (`usage_salt`); `app_meta.usage_since` holds the first day.
- An in-memory set of `signature|day` avoids a database write on every request.
- `record()` is called from two places: a successful `POST /session`, and
  `resolveHousehold()` (every data request with a valid session).

Honest note: the hash keeps signatures out of this table, but the salt lives in the same
database and the database already holds signatures in plain text (tariffs). It is data
minimisation, not protection against someone with access to the server.

## 4. Active installations (InfluxDB)

`HouseholdDataSource.activeSignatureCount(days)`:

```flux
import "influxdata/influxdb/schema"
schema.tagValues(bucket: "p1-smartmeters", tag: "signature", start: -30d)
  |> count()
```

`schema.tagValues` reads the index, so this is cheap. The fake data source returns the number
of fake households. The result is cached for 1 hour; an InfluxDB error leaves the field out.

## 5. Endpoint

```ts
// packages/shared
export interface StatsResponse {
  days: 30;
  activeUsers: number;
  /** Absent when InfluxDB could not be queried. */
  activeInstallations?: number;
  /** First day of user counting (ISO date) when that is less than `days` days ago. */
  usersSince?: string;
}
```

No session needed: the numbers are aggregates and reveal no signature. `prune()` runs
from the existing hourly maintenance timer, next to the database backup.

## 6. App

`SettingsPage` → About: a `useQuery(['stats'])` (stale time 5 minutes, no retries) and one
`IonNote` line under the version:

| Case                  | Nederlands                                                                        | English                                                                 |
| --------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Normal                | 23 actieve gebruikers · 41 actieve meterkits (laatste 30 dagen)                   | 23 active users · 41 active meter kits (last 30 days)                   |
| Counting < 30 days    | 23 actieve gebruikers sinds 15 nov 2026 · 41 actieve meterkits (laatste 30 dagen) | 23 active users since 15 Nov 2026 · 41 active meter kits (last 30 days) |
| One                   | 1 actieve gebruiker · 1 actieve meterkit                                          | 1 active user · 1 active meter kit                                      |
| Installations missing | only the users part                                                               |                                                                         |
| Request failed        | line not shown                                                                    |                                                                         |

## 7. Testing

- `tracker.test.ts`: one row per signature per day, 30-day window boundaries, prune, the
  salt is created once and reused, no signature in the table.
- `routes/stats.test.ts`: response shape, `usersSince` only during the first 30 days,
  installations missing on an upstream error, no session required.
- Session and data routes record use; unknown signatures (404) do not.
- `SettingsPage.test.tsx`: the line in both languages, singular forms, hidden on error.

## 8. Out of scope

- Statistics per day or a chart, counts per kit type (V01/V02).
- Counting devices or browsers (one household on two phones counts once).
- Any per-household information in the response.
