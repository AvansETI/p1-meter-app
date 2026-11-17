# Tariff fields that match the invoice

- Issue: #88
- Status: **approved** (2026-11-17)
- Date: 2026-11-17
- Builds on: [costs](2026-11-09-costs.md) §2 (tariff model), §3 (net metering)

## 1. Goal

Users copy their tariffs from the supplier invoice. The current fields do not follow that invoice,
which makes them confusing:

- the electricity section has no "Afname" heading;
- "Terugleververgoeding" does nothing for a dynamic contract;
- "Opslag op de terugleverprijs" has no counterpart on the invoice;
- "Terugleverkosten" says "vaak 0", while dynamic suppliers do charge it;
- fixed costs have to be converted to incl. VAT per month by hand.

This design was checked against a real invoice of a dynamic contract (May 2026). The invoice is
private and is not part of the repository; only its structure and rates are used below.

## 2. How a dynamic invoice is built up

All amounts excl. VAT; VAT (21 %) is charged on the total.

| Section | Line                               | Rate                                |
| ------- | ---------------------------------- | ----------------------------------- |
| Import  | Electricity (day-ahead price)      | weighted per quarter hour           |
| Import  | Purchase markup (inkoopvergoeding) | 2.05 ct/kWh                         |
| Import  | Energy tax                         | 9.16 ct/kWh                         |
| Export  | Production (day-ahead price)       | −weighted per quarter hour          |
| Export  | Purchase markup refunded           | −2.05 ct/kWh                        |
| Export  | Selling fee (verkoopvergoeding)    | +2.05 ct/kWh                        |
| Export  | Energy tax (net metering)          | −9.16 ct/kWh, corrected at year end |
| Fixed   | Supply fee (vaste leveringskosten) | € 4.95 per month                    |
| Fixed   | Grid costs (systeembeheerkosten)   | about € 1.08 per day                |
| Fixed   | Energy tax reduction               | about −€ 1.42 per day               |

Under net metering (until 2026) the refunded markup and the selling fee cancel out for this
supplier; other suppliers may differ.

**Check of the current engine.** With the invoice's quantities and weighted prices, markup 0.0205,
energy tax 0.0916, export markup 0 and fee 0, the engine's variable cost matches the invoice
within a few cents, the rounding of the weighted prices. The results are right; the field names
are the problem.

## 3. Decisions

| Topic                      | Decision                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Headings                   | Electricity gets "Afname" and "Teruglevering" for every contract type                              |
| Export price (dynamic)     | The day-ahead price per quarter hour; shown as text, not as a field                                |
| Feed-in compensation       | Only for single and double tariffs (incl. VAT); hidden for dynamic                                 |
| Selling fee                | `feePerKwh` for every type. Dynamic: excl. VAT, charged with VAT. Single/double: incl. VAT, as now |
| Refunded markup            | New switch `refundMarkupOnExport` (dynamic, net metering years only)                               |
| `dynamicMarkupPerKwh`      | No longer editable; kept in the schema for old data and converted (§5)                             |
| Fixed costs                | Entered as on the invoice: a switch "excl. btw" for all fixed amounts; grid costs per day or month |
| VAT on fixed costs         | 21 %, the standard rate                                                                            |
| Engine result for old data | Unchanged, except the VAT on the selling fee of dynamic contracts (a bug fix)                      |

## 4. Tariff model

Changes to `TariffPeriod` ([costs](2026-11-09-costs.md) §2):

```ts
export: {
  compensationPerKwh: number;      // single/double only, incl. VAT
  feePerKwh: number;               // single/double: incl. VAT; dynamic: excl. VAT
  refundMarkupOnExport?: boolean;  // dynamic: exported kWh earn the import markup back (until 2026)
  dynamicMarkupPerKwh?: number;    // legacy, read-only (§5)
};
fixed: {
  supplierPerMonth: number;
  gridPerMonth?: number;           // exactly one of gridPerMonth and gridPerDay
  gridPerDay?: number;
  exclVat?: boolean;               // absent = false: amounts incl. VAT, as before
};
taxReductionPerYear: number;       // follows fixed.exclVat
```

Validation: exactly one of `gridPerMonth` and `gridPerDay`. Stored versions keep their old shape
and stay valid, because all new fields are optional.

## 5. Engine

Per quarter hour, dynamic contract:

```
markupBack = refundMarkupOnExport && netMetering ? markupPerKwh : 0
earned     = export × (price + markupBack + (dynamicMarkupPerKwh ?? 0))
net metering:  ((import × (price + markup) − earned + energy tax on the year's net import)
                + export × fee) × (1 + VAT)
from 2027:     import × (price + markup + energy tax) × (1 + VAT) − earned + export × fee × (1 + VAT)
```

Single and double tariffs are unchanged (the fee is already incl. VAT).

Fixed costs per day:

```
vat     = exclVat ? 1.21 : 1
supply  = supplierPerMonth × vat / days in month
grid    = (gridPerDay ?? gridPerMonth / days in month) × vat
reduce  = taxReductionPerYear × vat / days in year
```

**Old data.** When the editor opens a period with `dynamicMarkupPerKwh`:

| Value                      | Converted to                                     |
| -------------------------- | ------------------------------------------------ |
| absent or 0                | nothing                                          |
| equal to the import markup | `refundMarkupOnExport: true`                     |
| negative                   | added to `feePerKwh` as a positive amount        |
| anything else              | kept; shown read-only with a button to remove it |

The conversion is saved only when the user saves. The engine keeps honouring a remaining legacy
value, so nothing changes until then.

## 6. Editor

Dynamic contract:

```
Stroom
  Afname
    Opslag / inkoopvergoeding per kWh (excl. btw)
    Energiebelasting per kWh (excl. btw)
    Btw
  Teruglevering
    Vergoeding: marktprijs (EPEX) per kwartier                         (text)
    Verkoopvergoeding per kWh (excl. btw)
    [ ] Inkoopvergoeding terug over teruggeleverde kWh (salderen, t/m 2026)
Vaste kosten
  [ ] Bedragen excl. btw (zoals op je factuur)
  Vaste leveringskosten per maand
  Netbeheerkosten (systeembeheerkosten)   [per dag | per maand]
  Vermindering energiebelasting per jaar
```

Single and double tariffs show "Terugleververgoeding per kWh (incl. btw)" and
"Terugleverkosten per kWh (incl. btw)" under "Teruglevering".

Help texts:

| Field                       | Help                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Selling fee (dynamic)       | Wat je leverancier per teruggeleverde kWh inhoudt; op je factuur bijv. "verkoopvergoeding".    |
| Refunded markup             | Staat op je factuur als negatieve "inkoopvergoeding" bij teruglevering. Geldt alleen t/m 2026. |
| Selling fee (single/double) | Wat je leverancier per teruggeleverde kWh inhoudt; heet ook "terugleverkosten".                |
| Excl. VAT switch            | Zet aan als je de bedragen van je factuur overneemt; de app rekent de btw (21 %) erbij.        |
| Grid costs                  | Heet op sommige facturen "systeembeheerkosten"; vaak per dag vermeld.                          |

## 7. Tests

- Engine: the invoice case (§2) with refund and selling fee 2.05 ct gives the same result as
  without both, within a cent; with the fee alone the result rises by `export × fee × 1.21`.
- Engine: the selling fee of a dynamic contract is charged with VAT, before and after 2027.
- Engine: fixed costs excl. VAT and grid per day give the same daily amount as the incl. VAT
  per-month equivalent.
- Schema: old periods (without the new fields) stay valid; exactly one grid field is required.
- Editor: conversion of `dynamicMarkupPerKwh` for each row of the table in §5; headings and
  fields per contract type.

## 8. Out of scope

- Supplier-specific credits such as grid balancing rewards.
- The VAT treatment of export credit after net metering ends (2027), apart from the selling fee.
- Gas tariffs.
