# Line chart demo enhancements — Design Spec

**Date:** 2026-09-02
**Package:** `@samirdamle/nano-charts`
**Status:** Approved design, pre-implementation

## 1. Purpose

The chart gallery demo (`demo/index.html`) currently shows only single-series line
charts. Two gaps, both raised while reviewing the gallery:

1. There's no way to show multiple lines on one chart (e.g. an actual vs. a target
   line), and no way to style a line's stroke beyond solid — no dashed/dotted lines.
2. The gallery is a static picture of each chart's output; there's no way to show
   that a rendered chart's data is still inspectable (which point is which, what its
   value is) after render, the way a real chart consumer would want for a tooltip.

This spec covers both: small additions to the core library (`src/`) to make
multi-series overlay and line styling possible, plus two new demo cards that show
them off, one of which is interactive.

This does **not** reopen the "no interactivity in the core" non-goal from the
[nano-charts core design](2026-09-01-nano-charts-design.md). The core stays a pure
`(data, options) => Scene` / `Scene → SVG string` pipeline with no event listeners.
The only core addition in that direction is inert `data-index`/`data-series`
attributes on dot marks — plain data, not behavior — so a consumer (the demo, or a
future framework wrapper) can attach its own listeners. All actual event wiring
lives in the demo's vanilla JS.

## 2. Library changes

### 2.1 Line styling — `strokeDasharray` / `strokeLinecap`

`Mark`'s `polyline` variant (`src/types.ts`) gains two optional fields:

```ts
| { type: 'polyline'; points: [number, number][]; fill?: 'none';
    stroke?: string; strokeWidth?: number;
    strokeDasharray?: string; strokeLinecap?: 'butt' | 'round' | 'square' }
```

`LineOptions` (`src/charts/line.ts`) gains matching passthrough options:

```ts
strokeDasharray?: string | number[]; // raw SVG dasharray, e.g. "4 2", or numbers auto-joined with spaces
strokeLinecap?: 'butt' | 'round' | 'square';
```

A `number[]` is joined with spaces before being placed on the mark. No boolean
sugar, no named presets ("dashed"/"dotted") — this exposes the actual SVG
primitive, so any pattern SVG supports (dashed, dotted via `"0 4"` + `round` cap,
dash-dot, etc.) is reachable. Both fields are optional and pass straight through
to `<polyline>`'s `stroke-dasharray` / `stroke-linecap` attributes in `toSVG`
(`src/render/to-svg.ts`).

### 2.2 Configurable dot radius

`LineOptions` gains `dotRadius?: number` (default `1`, matching today's hardcoded
value). Used for:

- the `dot: 'all' | 'last'` circles (currently hardcoded `r: 1`)
- the single-point fallback circle (currently `Math.max(1, strokeWidth + 0.5)`,
  becomes `Math.max(options.dotRadius ?? 1, strokeWidth + 0.5)`)

This lets a consumer render larger, easier-to-hit dots (needed for the interactive
demo card) without changing stroke width.

### 2.3 Multi-series overlay — new `lines()` export

New file `src/charts/lines.ts`, exported from `src/index.ts` alongside `line`.

```ts
export interface LineSeries<T = number> extends Partial<SeriesAccessors<T>> {
  data: SeriesInput<T>;
  name?: string;            // series display name, carried onto points as seriesLabel
                             // (named `name`, not `label`, because `label` on this
                             // interface is already `Partial<SeriesAccessors<T>>`'s
                             // per-point label *accessor* function — same-name string
                             // field would conflict with it)
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  dot?: 'none' | 'last' | 'all';
  dotRadius?: number;
}

export interface LinesOptions extends BaseOptions {
  // width/height/padding/title/desc shared across all series;
  // per-series `color` overrides this option's `color` as a default
}

export function lines<T = number>(series: LineSeries<T>[], options?: LinesOptions): Scene
```

Behavior:

- Normalizes each series independently via the existing `normalizeSeries`.
- Computes **one** combined y-domain via `extent()` over every series' values
  concatenated, so all series share a scale.
- Computes **one** shared index-based x-scale via `seriesLayout`, using the
  longest series' length as `count` (shorter series are positioned at their own
  indices within that range — no interpolation/alignment logic beyond what
  `seriesLayout` already does for `line()`).
- Builds marks by looping series in array order (each series's polyline, then its
  dot circles if requested) — later series draw on top, matching normal SVG
  paint order.
- Builds `points` as the concatenation of every series' points.

`ScenePoint` (`src/types.ts`) gains two optional fields to identify which series a
point in a multi-series scene belongs to:

```ts
seriesIndex?: number;
seriesLabel?: string;
```

`line()` continues to return points without these fields (`undefined`), so
existing single-series consumers are unaffected.

### 2.4 Hit-testing data attributes

`Mark`'s `circle` variant (`src/types.ts`) gains two optional fields:

```ts
| { type: 'circle'; cx: number; cy: number; r: number;
    fill?: string; stroke?: string; strokeWidth?: number;
    index?: number; seriesIndex?: number }
```

`line()` and `lines()` set `index` on every dot circle they emit, equal to that
point's position in the returned `scene.points` array (`lines()` also sets
`seriesIndex`). `toSVG`'s `renderMark` emits these as `data-index` / `data-series`
attributes whenever present — unconditionally, no new `toSVG` option. They're
inert data until a consumer's JS reads them; nothing renders or behaves
differently because of them.

All changes in this section are additive and optional — existing calls to
`line()`, `toSVG()`, and consumers of `Mark`/`ScenePoint` are unaffected.

## 3. Demo changes (`demo/index.html`)

### 3.1 Remove chart counts from group headings

The `group()` helper currently appends a `<span class="count">` showing
`entries.length` next to each group title (e.g. "LINE 3"). Remove that span and
the code that populates it — headings show just the group name.

### 3.2 Remove the "Fixed" badge from the Line group's single-point card

The Line group's `{ title: 'Single point — renders as a dot', scene: line([5]), fixed: true }`
entry drops `fixed: true`. (The Area group's equivalent single-point card and the
Heatmap group's ragged-rows card keep their `fixed` badges — this change is scoped
to the Line group's card only.)

### 3.3 New card: "Multiple series"

Added to the `Line` group, built with `lines()`. Three series sharing one y-scale,
each visually distinct:

| Series   | Style                                             |
| -------- | -------------------------------------------------- |
| Revenue  | solid, default `strokeWidth`                       |
| Target   | dashed (`strokeDasharray: "3 2"`), default width   |
| Forecast | thicker solid (`strokeWidth: 2.5`), no dash        |

Each series uses a distinct `color` (reusing existing CSS custom properties /
palette values from the demo page). This card is static — no interactivity — it
exists to visually demonstrate overlay + line-style options.

### 3.4 New card: "Hover & click"

Added to the `Line` group, built with `line(data, { dot: 'all', dotRadius: 2.5 })`
— every point gets an easy-to-hit dot (`data-index`-tagged per §2.4). Below the
chart's `<svg>`, inside the same card, a text line reflects interaction state:

- Idle (no hover, nothing clicked): `Hover or click a point`
- Hovering a dot (`pointerover`/`pointermove` targeting an element with
  `data-index`): `Hovering: index N — value V` — updates live as the pointer
  moves between dots
- Pointer leaves the chart: reverts to idle, **unless** a point has been clicked,
  in which case it shows the clicked state instead
- Clicking a dot: `Selected: index N — value V` — persists across pointer leaving
  the chart, until a different point is clicked (clicking replaces the selection;
  hovering elsewhere does not clear it, but does temporarily override the
  displayed text while the pointer stays over another dot)

Implementation: the shared `group()` helper (`demo/index.html`) gains support for
an optional `interactive: true` flag on a card entry. When set, `group()`, after
appending that card's `.chart` div, also appends a sibling `<div class="chart-info">`
initialized to the idle text, and attaches one delegated
`pointerover`/`pointermove`/`pointerleave`/`click` listener on the `.chart` div.
The listener reads `event.target.dataset.index`, looks up the corresponding entry
in `scene.points` (the entry's `Scene`, already in scope in `group()`'s loop), and
updates the info div's `textContent` per the state rules above. This is the only
change to `group()`; non-interactive entries (every other card) are unaffected
since the flag is absent/falsy for them.

## 4. Out of scope

- No tooltip/popover UI (the point data renders as plain text below the chart, not
  a floating tooltip).
- No keyboard interaction (focus/arrow-key navigation between points) for the
  interactive card.
- No changes to any chart type other than `line`/`lines` (area, bar, etc. do not
  get `strokeDasharray`/`dotRadius`/hit-testing attributes in this pass).
- No changes to the Area or Heatmap groups' existing `fixed` badges.
