# Delete a tariff version

- Issue: #91
- Status: **draft** (2026-11-17)
- Date: 2026-11-17
- Builds on: [costs](2026-11-09-costs.md) §5 (tariff storage, versions), §6 (cost cache)

## 1. Goal

Every save of the tariffs adds a version, so "Eerdere versies" fills up with near-identical
entries. The user can delete any version with a trash-can icon. Deleting the current version
makes the version before it current again.

The issue also asks that tariff periods are always sorted newest first and that a period with a
date between existing ones leads to recomputed costs. Both already work (§6); this change adds
regression tests for them.

## 2. Decisions

| Topic                   | Decision                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Which versions          | Every version, also the current one                                                       |
| Current version deleted | The newest remaining version becomes current, as if restored, but without a new version   |
| Only version left       | No trash-can; the server refuses (removing all tariffs is out of scope)                   |
| Numbers                 | Never reused: a new save gets the highest number ever handed out + 1                      |
| Confirmation            | Always, in a dialog                                                                       |
| Concurrency             | `If-Match: <current version>`, like saving; `409` when another device changed the tariffs |
| Rate limit              | Counts as a tariff write (30 per household per hour)                                      |
| Undo                    | None (out of scope)                                                                       |

## 3. Storage

Today `tariff_sets.version` is three things at once: the current version, the concurrency token
and the next number minus one. After deleting the current version, the current version goes
back while the numbering must not. Migration:

```sql
ALTER TABLE tariff_sets ADD COLUMN last_version INTEGER;
UPDATE tariff_sets SET last_version = version;
```

- `save`: the new number is `max(last_version, version) + 1`; `last_version` is set to it.
  The concurrency check stays on `version`.
- `restore` is unchanged: it saves the old profiles as a new version.

## 4. Deleting

`DELETE /api/v1/tariffs/versions/:version` with `If-Match: <current version>`, in one transaction:

| Case                                  | Result                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `If-Match` is not the current version | `409 conflict`                                                                              |
| Version does not exist                | `404 not_found`                                                                             |
| Earlier version                       | Delete its row from `tariff_versions`; the tariffs in use do not change                     |
| Current version, others exist         | `tariff_sets` takes the profiles and number of the newest remaining version; delete the row |
| Current version, no others            | `409 conflict`                                                                              |

The response is the tariff state afterwards (`TariffsResponse`), like saving and restoring, so
the app has the new current version and token at once.

**Costs.** The cost cache is keyed on the tariff version (`daily_costs.tariff_version`). When the
current version changes, cached days of another version are not used and are recomputed; a
cached day of the version that is current again is still right, because that version's
profiles never change. Deleting an earlier version changes no costs.

## 5. App

In the "Eerdere versies" dialog:

- Each row gets a trash-can button (icon `trashOutline`, `aria-label` "Versie N verwijderen"),
  after "Herstel deze versie". The current version has one too, unless it is the only version.
- Tapping it opens a confirmation:
  - earlier version: "Versie N verwijderen?";
  - current version: "Versie N verwijderen? Versie M wordt weer de huidige versie."
  - buttons "Annuleren" and "Verwijderen" (destructive).
- After deleting, the app reloads the tariffs, the version list, today's costs and the
  history, as after saving (`tariffs/queries.ts`).
- Errors use the existing messages (conflict, rate limit, other).

## 6. Sorting and recomputing (already in place)

- **Sorting.** The schema sorts periods by date on every save, and the list shows them newest
  first (`TariffsPage.tsx`). A period with a date between existing ones lands in its place.
- **Recomputing.** Every change of the tariffs creates a new version; cached days of other
  versions are recomputed. The app reloads costs and history after every save.

## 7. Tests

- Repository: delete an earlier version; delete the current one (previous becomes current,
  numbers not reused on the next save); refuse the only version; unknown version.
- Route: `If-Match`, `404`, `409`, rate limit, only the session's own household.
- Cost service: after deleting the current version, costs follow the version that is current
  again; adding a period with a date between two periods changes the costs from that date on,
  and not before it.
- App: trash-can per row (not on the only version), confirmation texts, cancel does nothing;
  periods newest first after adding one with a date between existing ones.

## 8. Out of scope

- Deleting several versions at once, or all earlier versions.
- Undo.
- Automatic cleanup of old versions.
