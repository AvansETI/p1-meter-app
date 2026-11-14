# Festive decoration (Christmas and New Year)

- Issue: #62
- Status: **approved** (2026-11-14)
- Date: 2026-11-14
- Builds on: [visual design](2026-11-09-visual-design.md), [language](2026-11-12-language.md)

## 1. Goal

Decorate the app's title bar during the holidays:

- **Christmas** (22–30 December): a string of twinkling lights along the bottom edge of the
  title bar and a few gently swinging baubles.
- **New Year** (31 December – 2 January): small fireworks going off continuously in the
  title bar.

The decoration is purely visual: it never covers charts or figures, never blocks taps, and
users can switch it off.

## 2. Decisions

| Topic          | Decision                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------- |
| Where          | Only the title bar of the main pages (Live, History, Settings); not modals or sheets          |
| Periods        | 22 Dec 00:00 – 30 Dec 23:59 Christmas; 31 Dec 00:00 – 2 Jan 23:59 New Year; device local time |
| Fireworks      | Continuous while the app is visible: a new rocket every 0.7–2 s, at most 3 bursts at a time   |
| Setting        | "Feestversiering" / "Holiday decorations" switch under Display, default on                    |
| Reduced motion | With `prefers-reduced-motion: reduce`: lights and baubles shown still, no fireworks animation |
| Accessibility  | `aria-hidden`, `pointer-events: none`; title and logo stay readable                           |
| Battery        | Fireworks stop when the page is hidden (`visibilitychange`) and run at most at 30 fps         |
| Preview        | `?festive=christmas`, `?festive=newyear` or `?festive=off` overrides the date for that visit  |
| Dependencies   | None: CSS animations for Christmas, one `<canvas>` for fireworks                              |

## 3. Season

`festive/season.ts` (pure, tested):

```ts
export type Season = 'christmas' | 'newyear';

/** The season for a local date, or null outside the holidays. */
export function seasonAt(date: Date): Season | null;

/** `?festive=` from the URL: a season, 'off', or undefined when absent or invalid. */
export function seasonOverride(search: string): Season | 'off' | undefined;
```

A `useSeason()` hook combines the override, the setting and the current date. It
re-checks the date every minute, so an app left open on 30 December switches to fireworks at
midnight. The override is read once at startup and kept for the visit (it survives
navigation inside the app, which drops the query string).

## 4. Rendering

`<FestiveDecoration />` sits inside each main page's `IonHeader`, after the `IonToolbar`.
`ion-header` is `position: relative`, so the decoration is an absolutely positioned layer
over the toolbar (`inset: 0`, below the iOS safe area via `env(safe-area-inset-top)`).

### 4.1 Christmas

- **Lights**: an SVG wire along the bottom edge of the title bar with a bulb every ~32 px, in
  four colours (red, gold, green, blue). Each bulb twinkles with a CSS animation
  (opacity and glow) with a staggered delay, so it never blinks all at once.
- **Baubles**: three small baubles (12–16 px) on short threads hanging from the top edge,
  placed in the free space between the title and the logo. They swing a few degrees.
  Their positions differ for iOS (centred title) and Material (title on the left).

### 4.2 New Year

A `<canvas>` the size of the title bar (device pixel ratio aware). Rockets rise from the
bottom edge and burst into 30–40 particles that fall back with gravity and fade out.
Colours: gold, white, red, blue and green. The animation loop runs with
`requestAnimationFrame`, capped at 30 fps, and stops while the document is hidden or
the setting is off.

### 4.3 Colours and themes

The title bar is navy (light theme) or dark grey (dark theme), so the same bright colours
work in both. The white MNEXT logo and the title stay on top in contrast; sparks are
small and semi-transparent where they cross the title.

## 5. Settings

`settings/storage.ts`: `festive: z.boolean().catch(true)`, `DEFAULT_SETTINGS.festive =
true`, `SettingsProvider` gets `setFestive(on)`. The switch is always visible under Display,
so it can be turned off before the holidays as well.

## 6. Testing

- `season.test.ts`: boundaries (21 Dec 23:59 → none, 22 Dec 00:00 → Christmas,
  30 Dec 23:59 → Christmas, 31 Dec → New Year, 2 Jan 23:59 → New Year, 3 Jan → none),
  override parsing.
- `FestiveDecoration.test.tsx`: renders lights for Christmas, a canvas for New Year, nothing
  outside the season or with the setting off; nothing animated with reduced motion.
- `SettingsPage.test.tsx`: the switch stores the setting.
- Preview on the dev server with `?festive=christmas` and `?festive=newyear`, iOS and
  Material, light and dark, phone and desktop, with screenshots, before release.

## 7. Out of scope

- Other holidays or decorations outside the title bar (no snow over the content).
- Sound.
- Server-side configuration of the dates.
