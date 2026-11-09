# Visual design: MNEXT house style

- Issue: #2
- Status: **approved** (2026-11-09)
- Date: 2026-11-09
- Related: [architecture](2026-11-09-architecture.md) §11 (web app)

## 1. Goal

The app — **MNEXT Energiemeter** — follows the MNEXT house style
(<https://www.mnext.nl>) while keeping the platform-adaptive behaviour decided in the
architecture: iOS behaviour on iOS, Material behaviour on Android, split-pane layout on
desktop. Ionic's adaptive components stay; only the theme changes.

## 2. Source of the house style

Extracted from the theme stylesheet and logo of mnext.nl on 2026-11-09:

| Element           | Value on mnext.nl                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Primary           | navy `#293D66`; dark navy `#222C3B`                                                       |
| Accent            | green `#1CAB7D`; dark green `#047563`                                                     |
| Light backgrounds | `#EFF3F2` (grey-green), `#F2F3F6` (grey), `#F4F2F9` (lilac), `#C8BBE6` (lilac)            |
| Typeface          | Nunito                                                                                    |
| Corner radius     | 5 px (buttons, cards), round for avatars/icons                                            |
| Logo              | `logo.svg` (87×65, navy wordmark, green diagonal strokes forming the X), `logo_white.svg` |
| Co-branding       | Avans and HZ logos (white versions on the site footer)                                    |

The product owner confirmed the logos may be used in this app.

## 3. Design tokens

Implemented as Ionic CSS variables in `apps/web/src/theme/variables.css`. Ionic also
needs `-rgb`, `-contrast`, `-shade` (base mixed with 12 % black) and `-tint` (base mixed
with 10 % white) per colour; these are generated from the base values below.

### 3.1 Light (default)

| Token                          | Value     | Use                                                        |
| ------------------------------ | --------- | ---------------------------------------------------------- |
| `--ion-color-primary`          | `#293D66` | toolbar, primary buttons, active tab, links                |
| `--ion-color-primary-contrast` | `#FFFFFF` | text on primary (10.75 : 1)                                |
| `--ion-color-secondary`        | `#047563` | secondary buttons, positive text (5.63 : 1 with white)     |
| `--ion-color-tertiary`         | `#6F55C2` | gas accents                                                |
| `--ion-color-success`          | `#047563` | "live" indicator text                                      |
| `--ion-color-warning`          | `#A15F00` | "no recent data" text                                      |
| `--ion-color-danger`           | `#C0392B` | errors                                                     |
| `--ion-background-color`       | `#FFFFFF` | page background                                            |
| `--app-surface`                | `#F2F3F6` | cards, chart panels                                        |
| `--app-surface-alt`            | `#EFF3F2` | splash, welcome, highlighted panel                         |
| `--ion-text-color`             | `#222C3B` | body text (14.08 : 1)                                      |
| `--app-text-muted`             | `#5A6475` | labels, axis text (≥ 5.3 : 1 on all backgrounds)           |
| `--app-radius`                 | `5px`     | cards, buttons, inputs                                     |
| `--app-brand-green`            | `#1CAB7D` | decorative accents only (logo strokes, live dot, dividers) |

### 3.2 Dark

Follows `prefers-color-scheme: dark`; the user can override (system / light / dark) in
Settings. Derived from dark navy `#222C3B`.

| Token                          | Value     | Use                                |
| ------------------------------ | --------- | ---------------------------------- |
| `--ion-background-color`       | `#161D29` | page background                    |
| `--app-surface`                | `#222C3B` | cards, toolbar                     |
| `--app-surface-alt`            | `#2B3648` | raised panels                      |
| `--ion-text-color`             | `#F2F3F6` | body text (≥ 10.98 : 1)            |
| `--app-text-muted`             | `#AAB3C2` | labels, axis text (≥ 5.76 : 1)     |
| `--ion-color-primary`          | `#8FA8DC` | links, active tab, primary buttons |
| `--ion-color-primary-contrast` | `#161D29` | text on primary buttons (7.09 : 1) |
| `--ion-color-secondary`        | `#3CCB96` | positive text                      |
| `--ion-color-tertiary`         | `#A894E6` | gas accents                        |
| `--ion-color-warning`          | `#F2B046` | "no recent data"                   |
| `--ion-color-danger`           | `#FF7A6B` | errors                             |

In dark mode the toolbar is `--app-surface` instead of navy, so the logo uses
`logo_white.svg`.

### 3.3 Data colours

Same meaning everywhere: live tiles, legends, charts, icons.

| Stream                   | Light            | Dark      | Contrast (light: white / `#F2F3F6`) | Contrast (dark: `#161D29` / `#222C3B`) |
| ------------------------ | ---------------- | --------- | ----------------------------------- | -------------------------------------- |
| Import (_afname_)        | `#293D66` navy   | `#8FA8DC` | 10.75 / 9.69                        | 7.09 / 5.90                            |
| Export (_teruglevering_) | `#189C71` green  | `#3CCB96` | 3.48 / 3.14                         | 8.19 / 6.82                            |
| Gas                      | `#6F55C2` purple | `#A894E6` | 5.59 / 5.04                         | 6.48 / 5.39                            |

Notes:

- MNEXT green `#1CAB7D` is only 2.93 : 1 on white, below the 3 : 1 required for
  graphical objects. Chart marks use the slightly darker `#189C71`; the brand green
  remains for decorative elements where contrast is not required.
- Gas purple is not on mnext.nl; it is a saturated version of the MNEXT lilac
  (`#C8BBE6`, 1.79 : 1 — too light for data).
- Import navy and gas purple have similar lightness (1.92 : 1 between them). They are
  never the only distinction: every series has a label/legend, and import and gas are
  never drawn in the same chart (gas has its own chart with m³ axis).
- Text in the colours above meets 4.5 : 1, except export green as small text
  in light mode (3.48 : 1); numeric export values are therefore printed in
  `--ion-text-color` with a green icon/marker, not in green text.

## 4. Typography

- **Nunito**, self-hosted via `@fontsource-variable/nunito` (no Google request at
  runtime, works offline, no third-party tracking). Fallback:
  `-apple-system, "Segoe UI", Roboto, sans-serif`.
- Numbers use `font-variant-numeric: tabular-nums` so live values don't jitter.

| Role          | Size / weight                       | Example               |
| ------------- | ----------------------------------- | --------------------- |
| Live value    | 48 px / 800 (mobile), 64 px desktop | `3,52 kW`             |
| Page title    | 22 px / 700                         | Live                  |
| Section title | 17 px / 700                         | Vandaag               |
| Body          | 16 px / 400                         |                       |
| Label, axis   | 13 px / 600                         | `kWh`                 |
| Caption       | 12 px / 400                         | `bijgewerkt 10:11:54` |

Units are written with a thin space and Dutch number formatting (`Intl.NumberFormat('nl-NL')`):
`3,52 kW`, `12,4 kWh`, `0,68 m³`.

## 5. Logo, icons, manifest

### 5.1 Logo use

| Place                    | Asset                                                      |
| ------------------------ | ---------------------------------------------------------- |
| Splash                   | `logo.svg` large (light), `logo_white.svg` (dark)          |
| Welcome screen           | `logo.svg`, medium                                         |
| Desktop side menu header | `logo.svg` / `logo_white.svg`, small                       |
| Mobile toolbar           | no logo (space); page title only                           |
| About (in Settings)      | MNEXT logo + "Lectoraat Smart Energy" + Avans and HZ logos |

The logo is not recoloured, stretched or cropped. Minimum display width 64 px.

### 5.2 App icon

The logo's thin strokes become hairlines at small sizes, so:

| Size                        | Design                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| 192, 512 px (`any`)         | full MNEXT logo, navy/green on white, centred, 70 % width                           |
| 512 px (`maskable`)         | same, logo within the 80 % safe zone, white background                              |
| 180 px (`apple-touch-icon`) | same as 192, no transparency                                                        |
| favicon (SVG + 32 px PNG)   | full logo SVG for modern browsers; 32 px PNG gets thicker strokes (stroke-width ×2) |

### 5.3 Web app manifest

```json
{
  "name": "MNEXT Energiemeter",
  "short_name": "Energiemeter",
  "lang": "nl",
  "display": "standalone",
  "start_url": "/",
  "background_color": "#EFF3F2",
  "theme_color": "#293D66"
}
```

`theme_color` switches to `#161D29` in dark mode via
`<meta name="theme-color" media="(prefers-color-scheme: dark)">`.

## 6. Splash screen

The OS splash (Android: icon on `background_color`; iOS: static startup image) is
shown while the browser starts. Then the **in-app splash** takes over:

```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│         M N E ╱ T           │   MNEXT logo, ~60 % of width (max 320 px)
│              ╱              │
│                             │
│   Lectoraat Smart Energy   │   Nunito 20 px / 700, --ion-text-color
│        Arno Broeders        │   15 px / 600, 75 % opacity (added 2026-11-09)
│                             │
│                             │
│                             │
│     [Avans]      [HZ]       │   small, muted (opacity .6), max 24 px high
└─────────────────────────────┘
  background --app-surface-alt (#EFF3F2 light / #161D29 dark)
```

Logo animation (added 2026-11-09, issue #3): the navy letters fade in (100–550 ms), the long
green stroke flies in along its own direction from the top right (200–800 ms), the short green
stroke from the bottom left (550–1000 ms), then the subtitle and author name rise in (700–1100 ms). Pure CSS in
`index.html`, so it runs before the JavaScript loads and fits within the 1.2 s minimum. With
`prefers-reduced-motion` the logo is shown static.

Behaviour:

- Shown on every **cold start** (page load), not when resuming from background.
- Rendered from inline HTML/CSS in `index.html`, so it appears before the JS bundle
  loads; removed when the app is ready **and** at least 1.2 s have passed since
  first paint. If the app takes longer, it simply stays until ready (no extra delay).
- Fade-out 250 ms; skipped when `prefers-reduced-motion` is set.
- The minimum time runs in parallel with loading, so on a slow network the splash
  adds no delay at all; on a fast cached start it adds at most ~1 s.
- iOS startup images (per device size) and the Android background colour are matched
  to the splash background so there is no visible flash between OS and in-app splash.

## 7. Wireframes

### 7.1 Welcome (no signature stored) — mobile

```
┌─────────────────────────────┐
│          [MNEXT]            │
│     MNEXT Energiemeter      │
│                             │
│ Bekijk het energieverbruik  │
│ van je huis, live en terug. │
│                             │
│ Code van je meter           │
│ ┌─────────────────────────┐ │
│ │2019-ETI-EMON-V01-│______│ │  prefix fixed, user types dynamic part
│ └─────────────────────────┘ │
│ Je vindt de code op …       │
│                             │
│ ┌─────────────────────────┐ │
│ │         Starten         │ │  primary button
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 7.2 Live — mobile

```
┌─────────────────────────────┐
│ Live                    ⚙︎   │  toolbar (iOS: large title; Android: Material)
├─────────────────────────────┤
│ ● live · 10:11:54           │  green dot + muted caption
│ ┌─────────────────────────┐ │
│ │ ▼ Afname                │ │  navy marker
│ │   3,52 kW               │ │  48 px / 800
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ▲ Teruglevering         │ │  green marker (only if hasExport)
│ │   0,00 kW               │ │
│ └─────────────────────────┘ │
│ Vandaag                     │
│ ┌──────────┐ ┌──────────┐   │
│ │Afname    │ │Terug     │   │
│ │12,4 kWh  │ │ 3,1 kWh  │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐                │
│ │Gas       │                │  purple marker (only if hasGas)
│ │0,68 m³   │                │
│ └──────────┘                │
│ ▁▂▃▅▃▂▁▁▂▆▇▅▃ last hour     │  small power sparkline
├─────────────────────────────┤
│  Live   │ Historie │ Instell.│  tab bar
└─────────────────────────────┘
```

When not live: the dot is grey and the caption reads
"geen recente data · laatst 14 okt 15:38" in warning colour; values are shown muted.

### 7.3 History — mobile

```
┌─────────────────────────────┐
│ Historie                    │
├─────────────────────────────┤
│ [Dag][Week][Maand][Jaar]    │  segment (iOS) / tabs (Material)
│  ‹   ma 9 nov 2026   ›      │
│ Stroom (kWh per uur)        │
│ ▆ ▅ ▃ ▂ ▂ ▃ ▅ ▇ ▆ ▄ ...     │  import bars up (navy), export bars down (green)
│ ▔ ▔ ▔ ▔ ▔ ▔ ▁ ▃ ▅ ▃ ...     │
│ Vermogen (kW)               │
│ ╱╲_╱╲__╱╲╱╲                 │  line, gaps shown as breaks
│ Gas (m³ per uur)            │  only if hasGas
│ ▂ ▁ ▃ ▅ ▃ ...               │
│ Totaal: afname 31,2 kWh ·   │
│ terug 5,4 kWh · gas 2,1 m³  │
└─────────────────────────────┘
```

A gap block ("niet uitgesplitst", architecture §7.4) is drawn as one hatched bar
spanning the gap, with a tooltip giving the total and the period.

### 7.4 Desktop (≥ 992 px)

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ [MNEXT]      │ Live                                     ● live 10:11│
│ Energiemeter │ ┌────────────────┐ ┌────────────────┐ ┌────────────┐ │
│              │ │ Afname 3,52 kW │ │ Terug 0,00 kW  │ │ Gas 0,68 m³│ │
│ ▸ Live       │ └────────────────┘ └────────────────┘ └────────────┘ │
│   Historie   │ ┌──────────────────────────────────────────────────┐ │
│   Instell.   │ │ Vermogen vandaag (kW)                             │ │
│              │ │  ╱╲_╱╲__╱╲╱╲___                                   │ │
│              │ └──────────────────────────────────────────────────┘ │
│              │ ┌───────────────────────┐ ┌────────────────────────┐ │
│              │ │ Stroom per uur (kWh)  │ │ Gas per uur (m³)       │ │
│              │ └───────────────────────┘ └────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────┘
  side menu background --app-surface; content --ion-background-color
```

## 8. Charts (ECharts theme)

- One ECharts theme per colour scheme, built from the tokens above (no hard-coded
  colours in components).
- Grid lines `--app-text-muted` at 15 % opacity; axis labels 13 px / 600 muted.
- Bars: radius 2 px on the outer end; import positive, export negative in the same
  electricity chart.
- Tooltips: surface background, 5 px radius, values in Dutch format with unit.
- Gaps: power line breaks (`connectNulls: false`); gap blocks hatched with the stream
  colour at 35 % opacity.

## 9. Accessibility

- Contrast as documented in §3 (text ≥ 4.5 : 1, graphical objects ≥ 3 : 1).
- Information is never colour-only: labels, legends and ▲/▼ markers.
- Supports dynamic type / browser zoom up to 200 % without loss of content.
- `prefers-reduced-motion` disables splash fade and chart animations.

## 10. Assets and licences

| Asset                      | Source                                                                        | Stored at                |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| MNEXT logo (colour, white) | `https://www.mnext.nl/app/themes/mnext/assets/img/logo.svg`, `logo_white.svg` | `apps/web/public/brand/` |
| Avans logo                 | mnext.nl footer image (white PNG); prefer an official SVG if available        | `apps/web/public/brand/` |
| HZ logo                    | mnext.nl footer image (white PNG); prefer an official SVG if available        | `apps/web/public/brand/` |
| Nunito                     | `@fontsource-variable/nunito`, SIL Open Font License                          | npm dependency           |

The footer images on mnext.nl are white versions for a dark background. On the light
splash a coloured (or navy) version is needed; if no official file is available the
white PNG is shown on the dark splash only and replaced by text on the light splash
until official files arrive. `apps/web/public/brand/SOURCES.md` records origin and
download date of each file.

## 11. Open points

| #   | Topic                                        | Proposal                                                                   |
| --- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Coloured Avans/HZ logos for the light splash | Ask MNEXT/Avans communication for official SVGs                            |
| 2   | Brand guidelines MNEXT                       | If an official guide exists, check tokens against it before implementation |
| 3   | Theme override in Settings                   | system / light / dark, default system                                      |
