# Shared gas analysis settings

- Issue: #70
- Status: **approved** (2026-11-15)
- Date: 2026-11-15
- Builds on: [gas analysis](2026-11-15-gas-analysis.md) §6–7, [costs](2026-11-09-costs.md) §5
  (SQLite, tariffs per household), [usage stats](2026-11-14-usage-stats.md) (hashing)

## 1. Goal

The gas analysis settings live in the browser, so desktop and mobile show different results for
the same household. Store them on the server per household, so every device uses the same
settings. Tariffs already work this way.

## 2. Decisions

| Topic           | Decision                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Shared          | All gas settings except `enabled` (gas analysis on/off), which stays per device                |
| Key             | Salted hash of the signature (`UsageTracker.hash`), like the other gas tables                  |
| First run       | Server empty → the device uploads its local settings; otherwise the device adopts the server's |
| Concurrent edit | Last write wins, whole object; no per-field merge                                              |
| Refresh         | On start-up and when the app returns to the foreground (`visibilitychange`)                    |
| Offline         | The local copy stays as cache; an unsent change is marked dirty and sent on the next refresh   |
| Profile privacy | The profile is stored with the settings, but only used for comparisons when `share` is on (§5) |
| Access          | No login, like tariffs: whoever knows the signature can change the settings (deliberate)       |

## 3. Data

Migration 7:

```sql
CREATE TABLE gas_settings (
  hash       TEXT PRIMARY KEY,
  settings   TEXT NOT NULL,   -- JSON, GasSharedSettings
  updated_at TEXT NOT NULL    -- ISO, set by the server
);
```

`gas_locations` (postcode → own station, read by the reference job) and `gas_profiles` (shared
profiles for the comparison) stay as they are. A save writes all three in one transaction:

- `gas_locations`: the postcode, or the row is deleted when there is none;
- `gas_profiles`: the profile when `share` is on, else the row is deleted.

So the three can no longer drift apart.

## 4. Shared schema

`GasSharedSettingsSchema` moves from `apps/web/src/settings/storage.ts` to
`packages/shared/src/gas/settings.ts`. It holds every current field except `enabled`:

- `postcode`
- `station`
- `base`
- `method`
- `cooking`
- `baseline`
- `years`
- `contractStart`
- `expected`
- `profile`
- `share`

The web schema becomes `GasSharedSettingsSchema` extended with `enabled`.

## 5. API

Both endpoints use the same household check as the other gas routes: the session's signature,
the household must have gas, and an unknown household gets a neutral `404`. Both are covered by
the global rate limit.

| Method | Path            | Body / response                                                                               |
| ------ | --------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/gas/settings` | `200 { settings: GasSharedSettings \| null, updatedAt: string \| null }`                      |
| PUT    | `/gas/settings` | body `{ settings }`, validated strictly → `200 { updatedAt }`; invalid → `400 invalid_format` |

`PUT /gas/profile` and `DELETE /gas/profile` stay for one release, for clients that have not
auto-updated yet. They also update `profile` and `share` in `gas_settings` when that row exists.
They are removed in the release after.

The `postcode` query parameter of `/gas/analysis` stays. Clients send it from the synced
settings, so the result is the same on every device.

## 6. Web

Local storage gets two fields next to `gas`:

- `gasSyncedFor`: the emon id the local gas settings were last synced with;
- `gasDirty`: true while a change has not reached the server.

A `useGasSettingsSync` hook in the app shell runs when an emon id is set and the household has
gas. It runs on start-up, on a change of emon id and on `visibilitychange` → visible:

1. `GET /gas/settings`.
2. Then one of these cases:
   - **Local changes are unsent** (`gasDirty`, synced for this emon id): `PUT` the local settings. Last write wins.
   - **Server has settings:** adopt them and keep the local `enabled`.
   - **Server is empty, and the local settings were never synced or synced for this emon id:** `PUT` them. This is the first-run upload.
   - **Server is empty, but the local settings belong to another emon id:** reset to the defaults, so one household's settings are never copied to another.
3. Set `gasSyncedFor` to the current emon id.

When the user changes a setting:

- `setGas` updates the local settings and sets `gasDirty`.
- A `PUT` is sent after 1 s of quiet; a successful save clears `gasDirty`.
- A failed save keeps `gasDirty`. The settings page then says "Niet opgeslagen op de server; wordt later opnieuw geprobeerd". This replaces the current "share failed" message.

Changing `enabled` is a local change only: it does not set `gasDirty` and sends nothing.

When settings are adopted from the server, React Query refetches the gas queries whose keys
depend on them. The settings are part of the query keys already.

## 7. Tests

- **API:**
  - GET when empty;
  - PUT then GET;
  - a second PUT overwrites the first;
  - invalid body;
  - no gas → 404;
  - a save syncs `gas_locations` and `gas_profiles` (share on, then off, postcode removed);
  - the legacy profile endpoints update `gas_settings`.
- **Web sync:**
  - first-run upload;
  - adopting server settings keeps the local `enabled`;
  - a dirty local change wins;
  - another emon id with an empty server resets to defaults;
  - a failed PUT keeps the change dirty and shows the message;
  - refresh on foreground.

## 8. Out of scope

- Sharing theme, language, festive decoration or hint state.
- Conflict warnings or merging per field.
- Authentication.
