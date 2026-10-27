# @samirdamle/nano-charts-react

## 0.2.0

### Minor Changes

- 7a45c94: Annotations v2: annotations on the remaining five charts, full-span reference lines, series targeting, and interactive annotations.

  - Annotations on `radar` (`x` = axis index, fractional indices interpolate the angle; `y` = value on the shared domain ceiling), `heatmap` (`x` = column, `y` = row, both integers, at the cell center; missing ragged cells drop), `pictogram` (`x` = series index, `y` = 1-based block number matching `scene.points`' `blockNumber`, centered on the block's slot; horizontal keeps logical coordinates), `bullet` (`x` = value on `[0, max]`, `y` ignored, on the centerline), and `winLoss` (`x` = data index, `y` ignored, centered on that index's block by sign). Every chart now accepts `annotations`.
  - Full-span `referenceLines` on the cartesian charts (`line`, `area`, `lines`, `bar`, `scatter`): `{ value, orientation, color?, thickness?, style? }`, drawn across the plot area only, above the data and below the annotations, never rescaling the chart, out-of-domain values dropped. On horizontal bars the perpendicular axis is the category axis for horizontal lines and the value axis for vertical ones. Reference line marks carry `nc-reference-line nc-reference-line-{i}` classes.
  - Series targeting: an optional `seriesIndex` on an annotation, positional like `scene.points`' `seriesIndex`. On `lines` and `radar` it tags the annotation with the series and defaults its color to that series' color (position unchanged — the scale is shared); on grouped `bar` it moves the annotation onto that sub-bar (and defaults its color to the segment's color); stacked and single bars keep the category center. A `seriesIndex` naming no series on that chart drops the annotation, including a series absent from one ragged bar column; charts without series drop any annotation carrying one.
  - Interactive annotations: an annotation with `interactive: true` appears in the new `scene.annotationPoints` layer (never `scene.points`), and the React wrappers render hit targets for it (same `hitRadius` as data points, default 4) behind the new `onAnnotationHover` / `onAnnotationClick` props; an interactive annotation's `label` becomes its accessible name. The chart description is unchanged. Non-interactive annotations still add no hit targets.

  Fully backward compatible: charts without `annotations` or `referenceLines` render byte-identical scenes, and annotations without `interactive` behave exactly as in v1. Size budgets raised for the new code: core `line` standalone 4.5 → 5 kB, core barrel 15 → 15.5 kB, React `LineNanoChart` standalone 5.5 → 6 kB; all figures refreshed on all surfaces. An internal refactor of the annotation builders (shared index ref-line scales, one unified reference-line builder, shared integer-index validation) trims the barrel to 15.29 kB with no behavior change.

- 11e6e41: Rename all React components from `…Chart` to `…NanoChart` (`LineChart` → `LineNanoChart`, `AreaChart` → `AreaNanoChart`, etc., including the `…ChartProps` interfaces) so they don't collide with chart components from other libraries (e.g. Recharts). Core function names (`line()`, `bar()`, …) are unchanged.

### Patch Changes

- 2fb9375: Add `annotations` to `line`, `area`, `lines`, `bar`, `scatter`, `donut`, and `gauge` (and their React components, which pass the option through): an array of marks laid on top of the chart's own marks, in the chart's data coordinates — `{ x, y, shape, color?, size?, emoji?, orientation? }` with `shape` one of `'dot' | 'square' | 'triangle' | 'line' | 'emoji'`. On `line`/`area`/`lines`, `x` is the data index (fractional indices interpolate) and `y` the data value on the chart's domain (shared across series on `lines`, no series targeting in v1); on `bar`, `x` is the category index at the category center and `y` the value on the shared domain (horizontal bars keep logical `x`/`y`); on `scatter`, `x`/`y` are data values; on `donut`/`gauge`, `x` is ignored and `y` maps to an angle as `startAngle + (y / domain) × span` (domain `max` in gauge mode, total in segmented donut mode, `[min, max]` on `gauge`), centered on the ring at mid-thickness radius. `color` defaults to the chart's color (ignored for emoji, whose own colours win); `size` defaults to `2` and means dot radius, square half-side, triangle center-to-vertex radius, line half-length, or emoji font size; `line` is a small dash at the point (horizontal by default, `orientation: 'vertical'` for a vertical dash), not a full-span reference line. Annotations are purely visual (never `scene.points`, no hover/click, no a11y change), never affect scales, domains, or automatic padding, and out-of-range annotations are dropped, not clamped to an edge. Annotation marks carry `nc-annotation nc-annotation-{i}` classes. Fully backward compatible: charts without `annotations` render byte-identical scenes. Size budgets raised for the new code: core `line` standalone 4 → 4.5 kB, React `LineNanoChart` standalone 5 → 5.5 kB.
- d8fd98e: CSS classes for styling charts: new `class` option in `BaseOptions` assigns developer CSS class(es) to the generated `<svg>` element (merged with the built-in `nc-chart` class and any `toSVG`/`className` render opt), and every mark now carries generated semantic classes — a kind class plus an indexed class (`nc-point nc-point-3`, `nc-bar nc-bar-2`, `nc-segment`, `nc-block`, `nc-line`, `nc-area`, `nc-cell`, `nc-connector`, `nc-track`, `nc-gridline`, `nc-axis`, `nc-tick`, `nc-label`, …). Multi-series marks also get `nc-series-{i}` (mirroring `data-series`), axis parts get `nc-axis-x`/`nc-axis-y`, and pictogram blocks get their fill state (`nc-filled`/`nc-empty`/`nc-partial`). Indexes mirror the existing `data-index` attributes. Fully backward compatible.
- 796efec: Add `connector` to `pictogram()` (and `PictogramChart`): an optional `{ color?, thickness?, style? }` object that draws one line per series joining its rendered blocks, from the center of the first block to the center of the last, rendered behind the blocks. Defaults to a solid 2px line in the series' block color; `style` accepts `'solid' | 'dashed' | 'dotted'`. Series with fewer than two blocks get no connector.
- d1f317c: internal refactor (no behavior change): the 11 chart wrapper components now share a single `renderNanoChart` body — each wrapper only declares its props interface and splits its data prop (`data`, or `series` for radar). Public API, prop types, and generic inference are unchanged.
- Updated dependencies [2fb9375]
- Updated dependencies [7a45c94]
- Updated dependencies [00696c6]
- Updated dependencies [d8fd98e]
- Updated dependencies [e222183]
- Updated dependencies [38df00c]
- Updated dependencies [b353bc5]
- Updated dependencies [796efec]
- Updated dependencies [e8c6e93]
- Updated dependencies [b05f13c]
  - @samirdamle/nano-charts@0.7.0

## 0.1.5

### Patch Changes

- 1e620af: Add automatic plot padding to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()`: when `padding` is omitted, each chart now measures its marks (half stroke width / dot radius at the data extrema) and its axes (line thickness, tick length, label boxes — measured from the exact marks the axis draws) and reserves just enough space on each side so nothing clips. Without axes the plot nearly fills the supplied width and height. Passing an explicit `padding` number or per-side object overrides any side; omitted sides stay automatic.
- 0a398e3: Add `highlights` to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()`: an array of zones drawn as background regions behind the chart data, e.g. `highlights: [{ x: [2, 5], color: 'rgba(240, 221, 130, 0.25)' }]`. Zones use the chart's data coordinates (index-based `x` on line/area/lines/bar, data values on scatter, cell indices on heatmap); omitting `x` spans the full plot width and omitting `y` the full height. Zones are clipped to the plot, purely decorative (no hover points), and never affect automatic padding.
- Updated dependencies [1e620af]
- Updated dependencies [0a398e3]
  - @samirdamle/nano-charts@0.6.0

## 0.1.4

### Patch Changes

- f88ad18: Add optional cartesian axes to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()` via new `xAxis` / `yAxis` options (off by default, so existing charts render unchanged). Each axis supports an axis line (or ticks-only with `line: false`), configurable line/tick color and thickness, automatic nice-number ticks (`ticks: true`) or explicit tick values, optional tick labels (`labels: true` or a formatter function), per-axis gridlines with configurable color, thickness, and `solid` / `dashed` / `dotted` style, and `position` to draw the axis at a specific data value (e.g. an x-axis at `y = 20` instead of `y = 0`). React chart components pick up the new props automatically.
- Updated dependencies [f88ad18]
  - @samirdamle/nano-charts@0.5.0

## 0.1.3

### Patch Changes

- Updated dependencies [6d6bc2d]
- Updated dependencies [6d6bc2d]
- Updated dependencies [6d6bc2d]
  - @samirdamle/nano-charts@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [b04ea81]
- Updated dependencies [fc11e77]
  - @samirdamle/nano-charts@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [7022741]
- Updated dependencies [591e715]
  - @samirdamle/nano-charts@0.2.0

## 0.1.0

### Minor Changes

- 14c64db: Add a `gap` option to `donut()`: space between adjacent segments in segmented mode, in user units (same units as `thickness`). Each segment is inset by half the gap on both ends, so the wrap seam at `startAngle` is gapped too. Defaults to `0.2`; `0` renders touching segments as before. Negative gaps behave as `0`, non-finite gaps fall back to the default, and a segment narrower than the full gap collapses to a zero-length arc instead of inverting. Ignored in gauge mode (a single value arc has nothing to gap against).
- cfc29ae: Add a `gauge()` chart (and `GaugeChart` React component). `gauge({ value, max }, options)` supports a `min` domain and two modes over a configurable dial (default the classic 270° sweep, `135°` → `405°`): `'arc'` sweeps a foreground arc to the value, `'needle'` points a `line` or `triangle` needle at the value over the dial. Colored `zones` (`{ to, color }` bands) form the dial background in arc mode or the dial itself in needle mode; `centerLabel` (string or formatter receiving `{ value, min, max, frac }`) renders a readout at the center (just below center in needle mode, clear of the hub).
- cbd8ce1: Initial release: React components for all eight nano-charts (`LineChart`, `AreaChart`, `BarChart`, `WinLossChart`, `BulletChart`, `DonutChart`, `ScatterChart`, `HeatmapChart`), with `onPointHover`/`onPointClick` interactivity and Next.js App Router support.
- bf72fd5: Add `pictogram()` and the `PictogramChart` React component: a countable-unit chart where each category is a column (or row) of uniform blocks — squares, dots, or emoji — and the block count is the value. Accepts numbers or `{ value, label?, color? }` objects (plus `value`/`label`/`id`/`colorAccessor` accessors). The block shape is defined once in `<defs>` and stamped with `<use>` (new first-class `defs`/`clipPath`/`use` mark types, rendered by both `toSVG` and the React `Marks` component); fractional counts render a partial block review-stars style via a per-block `<clipPath>`. Options: `block` (`{ kind: 'rect', radius? }` | `{ kind: 'circle' }` | `{ kind: 'emoji', emoji }`), `blockSize`, `gap` (fraction of `blockSize`, like `bar()`), `horizontal`, `unit` (value per block), and `idPrefix` for the defs id (pass a unique value per chart when inlining several pictograms in one document). Blocks are fixed-size so the scene sizes itself to the data; one hover/click point per block carries `col`, `blockNumber`, `blocksTotal`, and `partial`. Bad values follow the clamp policy (negatives/non-finite render zero blocks). Block `<use>` marks render with `stroke="none"` so they never pick up the root svg's inherited border. Color precedence matches `bar()`/`donut()` (per-datum `color` → uniform `options.color`), but the palette fallback is the pastel block palette (`#8fe6c4`, `#7fd8e6`, `#f3a8c7`, `#c6a6e8`, `#f0dd82`, cycling) instead of the categorical palette.
- e1fdd4b: Add `radar()` and the `RadarChart` React component: a multi-axis spider chart for comparing profiles across shared axes. Accepts a single series (`radar([4, 9, 2])`) or an array of series to overlay (`{ data, name?, color?, strokeWidth?, strokeDasharray?, strokeLinecap?, fill?, dot?, dotRadius? }`, plus `value`/`label`/`id` accessors). Angles start at the top and sweep clockwise on a shared `[0, max]` radial scale (defaults to the data max; values above an explicit `max` clamp to the rim). A decorative spider grid (spokes + quarter rings) and polygon fill are on by default; no labels or legend are rendered — values surface through hover/click points, one per axis per series, carrying `seriesIndex`/`seriesLabel`. Color precedence matches `lines()`: per-series `color` → uniform `options.color` → categorical palette.
- 6656f3a: Add `gridColor` and `gridOpacity` options to `radar()` for styling the decorative spider grid (spokes + rings). `gridColor` defaults to the chart color; `gridOpacity` defaults to 0.15 and clamps into [0, 1].

### Patch Changes

- 30b79f8: Fix partial pictogram blocks rendering as uniformly dim: the clipped overlay put `clip-path` directly on `<use>`, which browsers do not render. Partial blocks now reference a pre-clipped block variant defined in `<defs>` (the clip lives on a `<g>` wrapping the shape), so fractional fills display correctly for rect, circle, and emoji blocks in both `toSVG` and React output.
- 639534c: Fix pictogram charts sharing `<defs>`/clip ids when several are inlined in one document. `<use href="#…">` resolves document-wide, so every pictogram defaulted to `id="pictogram-block"` and later charts rendered the first chart's shape (dots showed as squares, emoji as tiny boxes, partials not as partials). The default `idPrefix` is now unique per chart (`pictogram-1`, `pictogram-2`, …); pass an explicit `idPrefix` to take control of the ids.
- 9c12188: Rendered SVGs no longer include a `<title>` child element: browsers display it as a hover tooltip (e.g. "radar chart"), which spoils the experience on tiny charts. The accessible name now comes from an `aria-label` attribute on the root `<svg>` (still `role="img"`); the `<desc>` data summary is kept, as it never produces a tooltip. The `title`/`desc` options still override the generated accessible name and description as before.
- Updated dependencies [70a37ce]
- Updated dependencies [e9984ad]
- Updated dependencies [c9b2e07]
- Updated dependencies [cfc29ae]
- Updated dependencies [14c64db]
- Updated dependencies [cd7e0d4]
- Updated dependencies [7614253]
- Updated dependencies [cfc29ae]
- Updated dependencies [2a301d2]
- Updated dependencies [43f265c]
- Updated dependencies [6710b2a]
- Updated dependencies [bf72fd5]
- Updated dependencies [30b79f8]
- Updated dependencies [639534c]
- Updated dependencies [e1fdd4b]
- Updated dependencies [6656f3a]
- Updated dependencies [cafb3a9]
- Updated dependencies [9c12188]
  - @samirdamle/nano-charts@0.1.0
