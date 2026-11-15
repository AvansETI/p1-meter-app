# Fuller festive scenes

- Issue: #75
- Status: **approved** (2026-11-15)
- Date: 2026-11-15
- Extends: [festive decoration](2026-11-14-festive-decoration.md),
  [more festive seasons](2026-11-15-more-festive-seasons.md)

## 1. Goal

Many title-bar decorations show only one or two figures: the shoe in the run-up to
Sinterklaas, the single moustache of Movember, and dozens of theme days. On a holiday the
title bar may be well filled. This change does two things:

- it makes Sinterklaas and Movember livelier;
- it lifts every sparse scene to a minimum.

## 2. Minimum per scene

Every scene gets at least:

- **four figures** in the free space next to the title. On iOS, where the title is centred, only the first four are shown, as before. Order is therefore the most telling first.
- **one full-width layer** over the title bar, one of:
  - falling or flying figures (`Falling`);
  - a figure crossing the bar (`Traveller`);
  - bunting;
  - an edge (vine or water).

Christmas, New Year (fireworks), Chanoeka (menorah) and Advent (candles) stay as they are.
They are full pictures of their own.

Extra figures come from the existing library (`scenes/library.tsx`) where it fits, and
otherwise from new small SVGs in the same style:

- 14–26 px;
- flat colours;
- one existing CSS animation each (`bob`, `hop`, `sway`, `wiggle`, `twinkle`, …).

With `prefers-reduced-motion` everything stands still, as now.

## 3. Sinterklaas

The roetveegpiet keeps the existing face with soot smudges.

**Run-up (`sinttime`, day after the arrival until 5 December)**, in this order:

1. shoe with a carrot;
2. three presents;
3. the walking piet throwing pepernoten (below).

**Pakjesavond (`sinterklaas`, 1–5 December)**, in this order:

1. mitre;
2. crosier;
3. presents;
4. the walking piet throwing pepernoten (below).

**The walking piet, in both periods:** it replaces the piet that peeks around the corner. It is a `Walker`:

- it walks to the right across the whole title bar, turns round (mirrored) and walks back, about 14 s per round trip;
- its legs move and it carries a sack over its shoulder;
- now and then it throws a pepernoot forward in an arc, which falls out of the bar (`Thrown`); the pepernoten do not fall from the sky;
- with reduced motion it stands still at the end of the free space, like the hare.

`Walker` is a new part next to `Traveller`. `Traveller` only crosses in one direction.

## 4. Movember

Figures:

1. A face with glasses and a hat, whose moustache ends curl up and spring back (`fx-twirl`, new).
2. A row of moustache styles that each wiggle in turn: handlebar, walrus, chevron and pencil.

Full-width layer: a few small moustaches drifting across the bar (`Falling` with `fx="drift"`).

## 5. Information on tap

Unchanged from the [more festive seasons design](2026-11-15-more-festive-seasons.md) §4: a
transparent button covers the **whole title bar**, above the decoration (`z-index` 12
against 11). A tap anywhere on the bar opens the popover with the description, not only on
an animated figure. That includes a figure that walks or falls across the bar. A test
checks this: the button spans the full title bar and lies above the decoration layer.

## 6. Code

- **New parts:**
  - `Walker` in `scenes/parts.tsx`, with its CSS: `festive-walk`, plus mirroring at the turning points;
  - animations `fx-twirl` and `fx-step` (legs);
  - all of these respect reduced motion.
- **New figures:** in `scenes/library.tsx`.
- **Scene changes:** in the existing scene files. Season dates and the information texts stay as they are.

## 7. Testing

- **Unit test:** every scene in `SCENES`, except the full pictures in §2, renders at least four figures and at least one full-width layer. A new sparse scene therefore fails the test.
- **Existing tests:** the tests for the decoration stay.
- **Manual check:** `?festive=sinttime`, `?festive=sinterklaas`, `?festive=movember` and a sample of theme days, each:
  - on a phone (iOS and Material);
  - on the desktop width;
  - with reduced motion.

## 8. Out of scope

- New seasons or other dates.
- Christmas, New Year, Chanoeka and Advent.
- Sound.
