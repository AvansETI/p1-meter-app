# Gas analysis with degree days and household comparison

- Issue: #68
- Status: **approved** (2026-11-15)
- Date: 2026-11-15
- Builds on: [architecture](2026-11-09-architecture.md), [gas chart](2026-11-09-gas-chart.md),
  [costs](2026-11-09-costs.md) §5 (SQLite), [usage stats](2026-11-14-usage-stats.md) (hashing)

## 1. Goal

A **Gas** tab that relates gas consumption to the weather (like mindergas.nl) and compares the
household with other app households and with CBS figures for comparable dwellings. All settings
it needs live in Settings → Gas analysis.

## 2. Decisions

| Topic                | Decision                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Weather source       | KNMI open data (`daggegevens.knmi.nl/klimatologie/uurgegevens`), hourly `T` and `FH`, no key; ~1 day behind                      |
| Open-data storage    | One InfluxDB bucket `open-data` for KNMI weather and CBS figures (§6.1); every public source is fetched once, then only new data |
| Location             | Local only: 2-digit postcode → nearest KNMI land station via a static table; or a station picked manually                        |
| What the server sees | Only the station number (and degree-day parameters); never the postcode                                                          |
| Day boundaries       | Calendar days in Europe/Amsterdam; daily weather = mean of the hourly values of that local day                                   |
| Degree days          | Base temperature 14–20 °C (default 18); method: plain, weighted (default) or effective                                           |
| Normal year          | Mean annual degree days of the station over the 20 complete years before the current year                                        |
| Analysis period      | All available gas data of the household (from 2023-08 in practice)                                                               |
| Computation          | Pure functions in `packages/shared/src/gas/` (testable); the API applies them, the web app only draws                            |
| App comparison       | Nightly job; one fixed reference method for every household (De Bilt, weighted, 18 °C); only aggregates leave the API            |
| Profile sharing      | Opt-in; stored under the salted HMAC of the signature (same salt as usage stats); deleted when sharing is switched off           |
| Minimum group size   | 5 households; smaller groups fall back to a broader group, never shown                                                           |
| CBS                  | StatLine 85140NED via OData, all years kept in `open-data`, checked monthly for a new year; profile classes identical to CBS     |
| Tab visibility       | Only when the household has gas (`capabilities.gas`), like the gas chart                                                         |
| Attribution          | "Weather data: KNMI · Comparison: CBS StatLine (CC BY 4.0)" under the comparison and in About                                    |

## 3. Degree days and analyses

All formulas work on **days** (and hours for §3.6). Gas per day is the counter increase between
the last reading of the previous day and the last reading of the day. Days whose boundary
readings lie more than 1 hour from midnight (kit offline) are left out rather than spread out.

### 3.1 Degree days

For a day with mean temperature `T` (°C), mean wind `W` (m/s) and base temperature `B`:

| Method    | Formula                                                                     |
| --------- | --------------------------------------------------------------------------- |
| Plain     | `max(0, B − T)`                                                             |
| Weighted  | plain × factor (Apr–Sep 0.8, Mar and Oct 1.0, Nov–Feb 1.1)                  |
| Effective | `max(0, B − (T − W/1.5))` × the same factor (the wind makes it feel colder) |

### 3.2 Baseline (cooking and hot water)

- **Automatic:** the median gas use of days with zero degree days under the _plain_ method,
  over the last 365 days. If there are fewer than 10 such days, the intercept of the regression
  (§3.3) is used.
- **Manual:** a value in m³/day in Settings overrides it.
- **Off:** when "Cooking/hot water on gas" is off, the baseline is 0 and all gas counts as
  heating.

### 3.3 Heating line (scatter plot)

A least-squares line `gas = a + b × degree days` over the heating days (degree days > 0) of the
last 365 days:

- `b`, the **heating slope**, is m³ per degree day: how much gas a degree day costs.
- `a` is the base load per day according to the line.
- R² is shown so the user can see how well the line fits.

The scatter plot shows all days, coloured per heating season (Jul–Jun), with the line of the
latest season.

### 3.4 Consumption per degree day

Per week, month and year: `(gas − baseline × days) / degree days`. Periods with fewer than
10 degree days (summer) are not shown: dividing by almost nothing yields noise. A dashed trend
line connects the months over the years.

### 3.5 Weather-corrected annual consumption and forecast

- **Corrected year:** `baseline × 365 + (actual − baseline × days) × normal DD / actual DD`,
  per calendar year. A year with less than 300 days of data is marked as incomplete.
- **Forecast for the current year:** actual consumption to date, plus for each remaining day the
  baseline plus `b` × the normal degree days of that calendar day (mean over the 20 normal
  years).

### 3.6 Hourly analysis

Over the last 90 days:

- **Temperature curve:** the mean gas per hour for each 1 °C bin of the outdoor temperature
  (bins with fewer than 5 hours left out).
- **Day profile:** the mean gas per hour of the day, for cold days (mean < 5 °C) and mild days
  (5–12 °C).

Meters that report gas only once an hour (DSMR 4) give whole-hour values that are shifted by
one hour. The existing hourly-update check (gas chart, §3) detects this, and the profile is then
shifted back.

## 4. Comparison

### 4.1 Reference value

Comparisons always use one number per household: the **weather-corrected consumption of the
last 365 days**, computed with one fixed reference method for all households (station
De Bilt, weighted degree days, 18 °C, automatic baseline). This keeps all households
comparable regardless of their own settings.

It is computed only when the household has at least 180 measured days holding at least 30% of a
normal year's degree days, and at least 50 m³ of
gas per year. Below 50 m³ the house is effectively heated without gas.

### 4.2 App households (nightly job)

- **Schedule:** at 11:00 each day, after KNMI has published the previous day.
- **Query:** one Flux query computes the daily gas of every household (`signature` as group)
  over the last 365 days.
- **Storage:** SQLite table `gas_reference(hash, annual_m3, updated_day)`. `hash` is
  `HMAC(salt, signature)`.
- **Endpoint:** returns only the user's own percentile plus P10, P25, P50, P75, P90 and the
  group size `n`. It never returns individual values or hashes.

### 4.3 Profile group (opt-in)

The dwelling profile is shared as `gas_profiles(hash, type, area, period, residents, solar,
heating, updated)`. Only filled-in fields count.

The group consists of shared profiles with the same values. If it has fewer than 5 households,
fields are dropped one at a time in this order: solar → residents → construction period →
floor area → heating → dwelling type. The page shows which group was used, e.g.
"Terraced, 100–150 m² (12 households)". If no group reaches 5 households, only the comparison
with all households is shown.

### 4.4 CBS

- **Source:** table 85140NED, every available year (`Perioden`, 2019–2025 today).
- **Rows fetched:** only gas-heated dwellings (`HoofdverwarmingEnZonnestroom` = CV/block total,
  with solar, without solar).
- **Columns fetched:** average and P10–P90, per dwelling and per m².
- **Storage:** measurement `cbs_gas` in the `open-data` bucket (§6.1), about 10k points per
  year. All years are fetched once (one OData request per year and page of 10,000 rows).
  After that a monthly check reads only the small `Perioden` list, and a new year is fetched
  when it appears.
- **Year:** the comparison of the last 365 days uses the latest CBS year. The Years card also
  shows, for each corrected calendar year, the CBS median of the same year when it exists.
- **Matching:** the profile is passed as query parameters (it is not stored for this). An empty
  field becomes CBS "Total".
- **Per m²:** uses the midpoint of the floor-area class. For "250+" it uses 300 m², and the
  per-m² line is shown only if a floor area is filled in.
- **Hybrid heat pump:** the page notes that CBS only covers dwellings heated with gas.
- **Caveat:** CBS corrects for temperature with the KEV method, so the comparison is indicative.
  The page says this.

### 4.5 Profile classes (identical to CBS)

| Field               | Values (CBS code)                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Dwelling type       | apartment (ZW25810), terraced (ZW25805), end-of-terrace (ZW25806), semi-detached (ZW10300), detached (ZW10320)                            |
| Floor area          | <50 (A050300), 50–75 (A025408), 75–100 (A025409), 100–150 (A025410), 150–250 (A025411), 250+ (A050301)                                    |
| Construction period | <1946 (ZW25799), 1946–1964 (ZW25800), 1965–1974 (ZW10406), 1975–1991 (ZW25801), 1992–2005 (ZW25815), 2006–2014 (ZW25818), 2015+ (ZW25797) |
| Residents           | 1 (A043072), 2 (A043073), 3 (A043074), 4 (A043075), 5+ (A043076)                                                                          |
| Solar panels        | yes (A052167), no (A052168), empty (A050299)                                                                                              |
| Heating             | gas boiler / block heating, hybrid heat pump (app only; CBS has no separate category)                                                     |

## 5. Location

- **Station table:** `packages/shared/src/gas/stations.ts` lists the KNMI land stations with
  hourly `T` and `FH` and their coordinates. Offshore and platform stations are excluded.
- **Postcode table:** `postcodeRegions.ts` holds 90 rows: 2-digit postcode → approximate centre.
  - It is generated once by a script (not shipped) that averages PDOK Locatieserver centroids of
    the 3-digit sub-areas.
  - It is committed as a static table and gives the nearest station by distance.
- **Settings:** the 2-digit postcode stays in localStorage. The station chosen from it, or
  picked manually, is sent with each request.
- **Default:** without a location the app uses De Bilt (260) and shows a hint to set one.

## 6. API

All endpoints need a session (like history) and are rate-limited.

| Endpoint                     | Query / body                                        | Response                                                                                                                 |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/gas/analysis`   | `station`, `base`, `method`, `baseline?`, `cooking` | daily rows `{day, m3, t, dd}`, heating line, baseline, per-period values, years, forecast, normal DD, latest weather day |
| `GET /api/v1/gas/hourly`     | `station`                                           | temperature curve, day profiles (cold/mild)                                                                              |
| `GET /api/v1/gas/comparison` | profile fields (optional)                           | own reference value; app percentiles (all + group); CBS row for the profile; CBS year                                    |
| `PUT /api/v1/gas/profile`    | profile                                             | 204; opt-in share                                                                                                        |
| `DELETE /api/v1/gas/profile` | —                                                   | 204; removes the shared profile                                                                                          |

- **Validation:** request parameters are validated with zod schemas in `packages/shared`. An
  unknown station returns `invalid_format`.
- **Caching:** analysis responses are cached per (signature, parameters) until the next weather
  day arrives.
- **Weather fetch:** happens lazily for a station the first time it is requested. That means
  about 20 years of hourly data, fetched per year, about 175k points. For an unseen station the
  first request may therefore take several seconds; the page shows a skeleton meanwhile.
  Weather for De Bilt is fetched at startup.

### 6.1 Open-data bucket

Data from public sources is cached in InfluxDB, following the price bucket (#33), so that KNMI
and CBS are each asked for any piece of data only once.

- **Bucket:** `open-data`, created by the user, with unlimited retention.
  - Measurement `knmi_hourly`: tag `station`, fields `t` (°C) and `fh` (m/s). The timestamp
    is the end of the KNMI hour (UT).
  - Measurement `cbs_gas`: tags `type`, `area`, `period`, `residents` and `heating` (CBS
    codes), fields `mean`, `p10`…`p90`, `mean_m2` and `p10_m2`…`p90_m2`. The timestamp is
    1 January of the CBS year.
- **Configuration:**
  - New keys `OPEN_DATA_INFLUX_BUCKET` and `OPEN_DATA_INFLUX_TOKEN`, a read/write token on that
    bucket only. Both are added to `.env.example` without values.
  - Without them (tests, local development without the bucket) an in-memory store is used.
- **`WeatherJob`** (like `PriceJob`):
  - It fills the gaps for each known station daily at 10:30, and when a new station is
    requested for the first time.
  - It records the stations in use in SQLite (`weather_stations`).
- **Derived values:**
  - Daily means, degree days and the 20-year normal are computed with Flux `aggregateWindow`
    (1d, Europe/Amsterdam).
  - They are cached in memory per station until the next weather day.
- **`CbsJob`:** runs monthly. It fetches years that are missing from the bucket and keeps
  the selected profile rows in memory for matching.
- **Polite fetching:**
  - All requests to KNMI and CBS run one at a time, with 2 seconds between them.
  - A failure is retried at the next run, without a burst of retries.
  - The User-Agent names the app and its URL.
- **Health** reports the status of both jobs, like the price job.

## 7. Web app

### 7.1 Gas tab

The page is a stack of cards, which become a two-column grid on desktop.

1. **Summary:**
   - this year so far;
   - forecast for the year;
   - corrected consumption last year, with the change in %;
   - heating slope in m³/degree day.
2. **Consumption per degree day:** a bar chart, switchable week / month / year, with the trend
   line.
3. **Heating line:** a scatter plot of gas against degree days, with the line, the baseline and
   R².
4. **Years:** a table with, per year: actual m³, degree days, corrected m³, and a mark for
   incomplete years.
5. **Hourly analysis:** the temperature curve and the day profile (cold/mild).
6. **Comparison:**
   - a horizontal percentile band for all app households, with a marker for the household;
   - the same for the profile group, if sharing is on;
   - the CBS band (P10–P90) with the average, and a per-m² line when the floor area is known;
   - a link to Settings when no profile is filled in;
   - the attribution line.

Charts use ECharts, like the history page, with the same theme tokens.

### 7.2 Settings → Gas analysis (own page, `/settings/gas`)

- **Location:** 2-digit postcode (input, validated 10–99) _or_ a station picker. The page shows
  the chosen station.
- **Degree days:** the method (segment control) and the base temperature (14–20 °C, step 0.5).
- **Gas use:** a "Cooking/hot water on gas" toggle and a baseline field (m³/day). The field
  shows the automatic value as a placeholder; leaving it empty means automatic.
- **Dwelling profile:** six selects with CBS classes, each with "Unknown".
- **Sharing:** the toggle "Compare with similar households", with a short explanation of what is
  shared.
  - Switching it on sends `PUT`; switching it off sends `DELETE`.
  - Changing the profile while sharing sends a new `PUT`.

All of this lives in the local settings as `gas: {…}`. The settings schema stays version 1,
with optional fields and `.catch` defaults.

### 7.3 Navigation

`NAV_ITEMS` gets `gas` (flame icon) between History and Settings. The tab bar and side menu
filter it on `capabilities.gas`, and `/gas` redirects to `/live` without gas.

## 8. Testing

- **Shared:** degree days per method, baseline, regression, per-period values, corrected year,
  forecast, hourly bins and the DSMR 4 shift, group fallback, CBS mapping. All tests use fixed
  data.
- **API:**
  - KNMI and CBS clients with fixtures in `__fixtures__`;
  - the weather store and job (incremental fill, in-memory store in tests);
  - the comparison job with the fake source (hash, ≥5 rule, no individual values in responses);
  - routes (session required, validation, profile PUT/DELETE).
- **Web:** the Gas page with mocked API data (cards render, the tab is hidden without gas), the
  settings page (postcode → station, toggles, sharing calls).
- **Manual:** the dev server with real data for the user's own household, plus screenshots.

## 9. Findings during implementation

- **Influx shards:** the `open-data` bucket needs a shard group duration of 52 weeks. With the
  default 7 days for unlimited retention, 20 years of hourly data would make over 1,000
  shards, and writes timed out.
- **Writes:** points are written in chunks of 750, roughly a month of hours each.
- **KNMI request window:** KNMI reads `start` and `end` as a date range plus an hour window
  applied to every day. Requests therefore always ask for hours 01–24, i.e. whole days.
- **Gap repair:** the current year is fetched again from 1 January when it lacks more than
  72 hours.
- **Gas query speed:**
  - Aggregating a year of 5-minute gas readings per day takes about 3.5 s.
  - The history is therefore read in quarters.
  - It is kept per household in memory and afterwards only topped up.
  - The first analysis of a household takes about 15 s; after that it answers in
    milliseconds.
- **CBS rows:** loaded into memory after every job pass, not on the first comparison.
- **CBS band:** CBS publishes deciles, so the inner CBS band uses P20–P80 instead of the
  quartiles.
- **Pending station:** while the weather of a new station is being fetched, the page shows
  only a notice and refreshes every 15 seconds.

## 10. Changes after review (2026-11-15)

- **Postcode on the server:** the 2-digit postcode region may be stored on the server; it is
  not privacy-sensitive.
  - The web app sends it with the analysis request.
  - It is stored in `gas_locations` under the hashed code, and deleted when the user clears
    it.
  - The nightly reference value then uses the household's own station and its normal,
    falling back to De Bilt when no region is known or that station's weather is incomplete.
- **Daily readings kept:**
  - Daily gas readings are stored in `gas_day_ends`, under the hashed code.
  - After a restart or deploy only the newest days are read from InfluxDB. The analysis and
    the nightly job share these readings.
- **Pre-loading:** the web app starts loading the analysis, the hourly analysis and the
  comparison as soon as the session is known, while the splash screen still shows.
- **On/off:**
  - Settings has a "Show gas analysis" toggle, on by default.
  - When off, the Gas tab, the gas settings page and the pre-loading are gone.

- **Zero days:** a day with exactly 0 m³ is treated like a gap everywhere: it is almost always
  a day nobody was home.
- **Baseline per month:** the automatic baseline is determined for every month from the warm
  days of the 12 months up to and including it.
  - Each day uses the baseline of its month.
  - The Summary shows the current month's value, in whole m³ per month.
  - The Years table shows each year's mean.
- **Normal year from daily data:**
  - The 20-year normal comes from KNMI daily means: one request per station.
  - Hourly weather is fetched only from 2023, the year the first household data arrived.
  - A new station is ready in about 25 s.
  - Stations whose stored weather is complete count as ready at start-up, before any top-up.
- **Summary:** "last 12 months, corrected" (versus the 12 months before) replaces the last
  complete calendar year, and a degree-days tile compares this year so far with the normal.
- **Comparison bands:** the values sit under their own positions, and a legend explains the
  bands.

## 11. Out of scope

- Electricity analysis.
- Exports.
- Regional CBS figures.
- Weather forecasts (the forecast uses normal weather, not a weather forecast).
