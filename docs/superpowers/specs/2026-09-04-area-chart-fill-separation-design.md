# Area chart fill/line separation — Design Spec

**Date:** 2026-09-04
**Package:** `@samirdamle/nano-charts`
**Status:** Approved design, pre-implementation

## 1. Purpose

`area()` already emits two marks — a closed fill `path` and a top-edge `polyline`
— but the fill `path` never sets `stroke`. Because the root `<svg>` (`toSVG`,
`src/render/to-svg.ts`) sets `stroke="currentColor"` as a presentation-attribute
default, that fill path inherits a visible 1px outline around its entire
perimeter (bottom edge, both sides, and top edge), which stacks visually with
the separate top-edge `polyline` stroke. The result reads as one bordered blob
rather than "a line with shaded area beneath it."

This spec fixes that, and adds a `fillColor` option so the area's shading can
use a different color than the line, not just a lower opacity of the same
color.

## 2. Library changes (`src/charts/area.ts`)

### 2.1 Remove the stray border

The fill `path` mark gets an explicit `stroke: 'none'`:

```ts
{ type: 'path', d, fill: fillColor, fillOpacity, stroke: 'none' }
```

This is the actual bug fix — everything else in this spec is additive. With
this alone, the area has no border and the top `polyline` is the only visible
line.

### 2.2 New `fillColor` option

`AreaOptions` gains:

```ts
fillColor?: string;
```

Resolved the same way `winColor`/`lossColor` resolve against `color` in
`src/charts/win-loss.ts`:

```ts
const fillColor = options.fillColor ?? color;
```

`color` continues to be the line `polyline`'s stroke color (unchanged
behavior). `fillColor` is the fill `path`'s `fill`, defaulting to `color` so
every existing call to `area()` renders identically to today (same color,
same `fillOpacity`) — only the border disappears. Passing `fillColor`
explicitly lets a caller shade the area differently from the line (e.g. a
muted gray fill under a bright line stroke).

### 2.3 Single-point case

Unaffected — the single-point fallback already renders a `circle` in `color`,
not a fill path. No change.

## 3. Demo changes (`demo/index.html`)

Add one card to the `Area` group demonstrating `fillColor`, e.g. a line-colored
stroke over a distinctly-shaded fill, so the line/fill separation and the new
option are visible in the gallery alongside the existing `Basic` and
`Single point` cards.

## 4. Out of scope

- No change to `fillOpacity`'s default value (stays `0.2`).
- No change to the single-point dot rendering.
- No equivalent `fillColor`-style option added to other chart types in this
  pass (bar, donut, bullet, win-loss already have their own established
  per-part color options where relevant).
