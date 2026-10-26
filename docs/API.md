# nano-charts API reference

Tiny SVG charts for table cells and metric cards. Every chart is a pure function —
`data → Scene` — and a separate renderer turns the `Scene` into pixels: `toSVG()`
for an SVG string, or the React components for JSX with hover/click interactivity.

```ts
import { line, toSVG } from '@samirdamle/nano-charts';

const scene = line([4, 9, 2, 7, 5]); // data → Scene
const svg = toSVG(scene); // Scene → '<svg …>…</svg>'
```

```tsx
import { LineNanoChart } from '@samirdamle/nano-charts-react';

<LineNanoChart data={[4, 9, 2, 7, 5]} dot="last" onPointClick={(p) => console.log(p)} />;
```

## Mental model

**Scene.** A chart function returns a `Scene`: `{ width, height, viewBox, marks,
points, a11y }`. `marks` is the visual layer (a small union of `polyline`,
`path`, `rect`, `circle`, `line` descriptors); `points` is the data layer —
each datum's computed `{ id, label, value, index, x, y }` (plus `seriesIndex` /
`seriesLabel` for multi-series charts, `row` / `col` for heatmaps) so wrappers
can attach hover/click handlers without reverse-mapping coordinates. `a11y`
carries the `<title>`/`<desc>` text; every chart is accessible by default and
SSR-safe (no DOM access, no randomness).

**Inheriting text color.** `color` defaults to `currentColor` everywhere, so a
chart picks up the surrounding text color with no configuration. Explicit colors
always win over the default, and per-datum/per-series colors win over a uniform
`color`.

## Data input shapes

Series charts (`line`, `area`, `lines` series, `bar`, `winLoss`) accept three
shapes, normalized by the same pipeline:

| Shape                      | Example                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `number[]`                 | `[4, 9, 2, 7]`                                                                                                 |
| Object points              | `[{ value: 4, label: 'Mon', id: 'm' }, …]` — `label`/`id` optional, `color` supported where the chart reads it |
| Custom objects + accessors | `orders.map(...)` with `value: (o) => o.total`, plus optional `label` / `id` accessors                         |

A single datum with no values renders an empty scene (never throws).

## Options shared by every chart

`BaseOptions` — every chart accepts these:

| Option    | Type                                         | Default                      | Description                                           |
| --------- | -------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `width`   | `number`                                     | `100`                        | SVG width in user units                               |
| `height`  | `number`                                     | `20`                         | SVG height in user units                              |
| `color`   | `string`                                     | `'currentColor'`             | Uniform color; inherited from text color when omitted |
| `padding` | `number \| { top?, right?, bottom?, left? }` | automatic                    | Inner padding in user units; defaults to just enough so marks and axis labels never clip |
| `title`   | `string`                                     | per-chart default            | `<title>` for screen readers                          |
| `desc`    | `string`                                     | per-chart default            | `<desc>` for screen readers                           |
| `class`   | `string`                                     | —                            | CSS class(es) on the `<svg>` element, merged with the built-in `nc-chart` class — see Styling with CSS |

## Styling with CSS

Every chart is styleable with plain CSS — no wrapper divs or inline-style
threading needed.

**Your class on the svg.** Pass `class` in any chart's options:

```ts
line(revenue, { class: 'revenue-chart' });
// <svg class="nc-chart revenue-chart" …>
```

It merges with the `className` opt of `toSVG` / the `className` prop of the
React components, so all three compose: `nc-chart` + options `class` +
render `className`.

**Generated mark classes.** Every mark carries semantic classes under the
`nc-` prefix — a kind class plus an indexed class, so you can style all of a
kind or one specific item:

```html
<svg class="nc-chart revenue-chart" …>
  <path class="nc-line" …/>
  <circle class="nc-point nc-point-0" …/>
  <circle class="nc-point nc-point-1" …/>
</svg>
```

```css
.revenue-chart .nc-point { fill: gold; }      /* all points in this chart */
.revenue-chart .nc-point-1 { r: 3; }           /* the second point */
.nc-bar { opacity: 0.9; }                      /* all bars, every chart */
```

The taxonomy (kinds are chart-agnostic — per-chart scoping comes from your
svg-level class):

| Kind           | Marks                                              | Example                    |
| -------------- | -------------------------------------------------- | -------------------------- |
| `point`        | line/area/scatter/radar dots                       | `nc-point nc-point-2`      |
| `line`         | line/area/radar strokes                             | `nc-line`                  |
| `area`         | area/radar fills                                    | `nc-area`                  |
| `bar`          | bar, win-loss, and bullet measure bars              | `nc-bar nc-bar-0`          |
| `segment`      | donut segments                                      | `nc-segment nc-segment-1`  |
| `block`        | pictogram blocks                                    | `nc-block nc-block-3`      |
| `cell`         | heatmap cells                                       | `nc-cell nc-cell-5`        |
| `connector`    | bar waterfall links, pictogram gap lines            | `nc-connector nc-connector-0` |
| `track`        | bar/donut/gauge background tracks                   | `nc-track`                 |
| `gridline`     | axis gridlines                                      | `nc-gridline nc-gridline-0`|
| `axis`         | axis lines                                          | `nc-axis nc-axis-x`        |
| `tick`         | axis tick marks                                     | `nc-tick nc-tick-2`        |
| `label`        | axis tick labels, donut/gauge center labels         | `nc-label`                 |
| `highlight`    | highlight zones                                     | `nc-highlight nc-highlight-0` |
| `annotation`   | annotation marks                                    | `nc-annotation nc-annotation-0` |
| `reference-line` | reference lines                                   | `nc-reference-line nc-reference-line-0` |
| `zone`         | gauge zone bands                                    | `nc-zone nc-zone-0`        |
| `arc`          | gauge value arc                                     | `nc-arc`                   |
| `needle`, `hub`| gauge needle and its pivot dot                      | `nc-needle`                |
| `range`        | bullet range bands                                  | `nc-range nc-range-0`      |
| `target`       | bullet target tick                                  | `nc-target`                |
| `spoke`, `ring`| radar grid spokes and concentric rings              | `nc-spoke nc-spoke-1`      |

Qualifiers ride along as extra classes: marks in a multi-series chart also
get `nc-series-{i}` (mirroring the `data-series` attribute), axis parts get
`nc-axis-x` / `nc-axis-y`, and pictogram blocks get their fill state —
`nc-filled`, `nc-empty`, or `nc-partial`:

```css
.stages .nc-block.nc-empty { opacity: 0.35; }  /* dim unfinished blocks */
.stages .nc-series-1 .nc-point { fill: teal; } /* one series' points */
```

Indexes mirror the `data-index` attributes the renderers already emit, so
classes and data attributes tell the same story.

## Axes

`line`, `area`, `lines`, `bar`, `scatter`, and `heatmap` accept optional `xAxis`
and `yAxis` options (the same `AxisOptions` shape on every chart). Axes are off
by default — pass `xAxis: { show: true }` to draw one.

```ts
line([4, 18, 9, 26, 14, 30, 21], {
  yAxis: {
    show: true,
    ticks: true,
    labels: true,
    gridlines: { show: true, style: 'dashed' },
  },
  xAxis: { show: true, ticks: true },
});
```

| Option          | Type                                                     | Default            | Description                                                            |
| --------------- | -------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `show`          | `boolean`                                                | `false`            | Draw this axis                                                         |
| `line`          | `boolean`                                                | `true`             | Draw the axis line; `false` gives ticks-only mode                      |
| `color`         | `string`                                                 | `'currentColor'`   | Axis line color (also the default for ticks and labels)                |
| `thickness`     | `number`                                                 | `1`                | Axis line thickness in user units                                      |
| `ticks`         | `boolean \| number[]`                                   | `false`            | `true` for automatic nice ticks, an array for explicit tick values     |
| `tickCount`     | `number`                                                 | `5`                | Target tick count for automatic ticks                                  |
| `tickSize`      | `number`                                                 | `4`                | Tick length in user units                                              |
| `tickColor`     | `string`                                                 | axis `color`       | Tick color                                                             |
| `tickThickness` | `number`                                                 | axis `thickness`   | Tick thickness in user units                                           |
| `labels`        | `boolean \| (value: number) => string`                  | `false`            | Tick labels; pass a function for custom formatting                     |
| `labelColor`    | `string`                                                 | axis `color`       | Label color                                                            |
| `fontSize`      | `number`                                                 | `10`               | Label font size in user units                                          |
| `position`      | `number`                                                 | `0`                | Data value on the perpendicular axis the axis line sits at, clamped to the domain |
| `gridlines`     | `{ show?, color?, thickness?, style? }`                  | all off / defaults | Gridlines at the tick positions; `style`: `'solid' \| 'dashed' \| 'dotted'` |

Notes:

- On index-based charts (`line`, `area`, `bar`), x-axis ticks are integer data
  indices; explicit tick arrays are snapped to valid indices. `scatter` and
  `heatmap` use data values (heatmap: row/column indices at cell centers).
- Gridlines render at the tick positions even when `ticks` is `false` — set
  `gridlines: { show: true }` alone for label-free grids.
- `position` places an axis mid-plot, e.g. `xAxis: { show: true, position: 20 }`
  draws the X axis at y = 20. Ticks always point outward from the plot area.
- Gridlines draw behind the chart data; the axis line, ticks, and labels draw
  in front of it. Padding is automatic: each chart measures how far its axes
  overflow the plot and reserves exactly that much space, so labels never
  clip without hand-tuned `padding`. Pass an explicit `padding` (number or
  per-side object) to override any side; omitted sides stay automatic.
- React components (`LineNanoChart`, `BarNanoChart`, …) accept the same `xAxis` /
  `yAxis` props.

## Highlight zones

`line`, `area`, `lines`, `bar`, `scatter`, and `heatmap` accept an optional
`highlights` option: an array of zones drawn as background regions
behind the chart data, clipped to the plot. Zones are purely decorative —
they never affect automatic padding and emit no hover points.

```ts
line([4, 18, 9, 26, 14, 30, 21], {
  highlights: [
    // x-only: full-height band over indices 2–4
    { x: [2, 4], color: 'rgba(240, 221, 130, 0.25)' },
    // y-only: full-width band over values 20–30
    { y: [20, 30], color: 'rgba(243, 168, 199, 0.25)' },
  ],
});
```

| Option  | Type               | Default          | Description                                        |
| ------- | ------------------ | ---------------- | -------------------------------------------------- |
| `x`     | `[number, number]` | full plot width  | Data range on the x scale                          |
| `y`     | `[number, number]` | full plot height | Data range on the y scale                          |
| `color` | `string`           | (required)       | Fill color; use `rgba()`/`hsla()` for translucency |

Notes:

- Zones use the chart's data coordinates — the same coordinates the axis
  ticks use. On index-based charts (`line`, `area`, `lines`, `bar`) `x` is a
  data index (`bar` addresses bar centers); on `scatter` both are data
  values; on `heatmap` they are column/row indices at cell centers. On
  horizontal bars the axes flip: `x` is the value scale, `y` the category
  scale.
- Reversed ranges (`[5, 2]`) are normalized; zones partly outside the plot
  are clipped to it, and zones entirely outside it are skipped.
- React components (`LineNanoChart`, `BarNanoChart`, …) accept the same `highlights`
  prop.

## Annotations

Every chart accepts an optional `annotations` option: an array of marks
laid on top of the chart's own marks, in the chart's data coordinates.
Annotations are purely visual by default — they are never added to
`scene.points`, so they get no hover/click points, and they never affect
the chart's scales, domains, or automatic padding (so a mark at a domain
edge can extend up to its `size` past the plot box; set explicit `padding`
if that clearance matters). Annotations carry the
`nc-annotation nc-annotation-{i}` classes, where `i` is the annotation's
position in the input array.

```ts
line([3, 7, 2, 9, 5, 6], {
  annotations: [
    { x: 3, y: 9, shape: 'dot', color: '#ef4444' }, // the peak
    { x: 2, y: 2, shape: 'triangle' }, // the trough
    { x: 1, y: 7, shape: 'emoji', emoji: '⚠️', size: 4 }, // a warning
  ],
});
```

| Option        | Type                                              | Default          | Description                                                        |
| ------------- | ------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `x`           | `number`                                          | (required)       | Data x — see per-chart mapping below (ignored on donut/gauge)      |
| `y`           | `number`                                          | (required)       | Data y — see per-chart mapping below                               |
| `shape`       | `'dot' \| 'square' \| 'triangle' \| 'line' \| 'emoji'` | (required) | Mark shape                                                         |
| `color`       | `string`                                          | chart's `color`  | Mark color; ignored for `emoji`, whose own colours win             |
| `size`        | `number`                                          | `2`              | Dot radius, square half-side, triangle center-to-vertex radius, line half-length, or emoji font size, in chart units |
| `emoji`       | `string`                                          | —                | Required when `shape` is `'emoji'`: the character(s) to render     |
| `orientation` | `'horizontal' \| 'vertical'`                      | `'horizontal'`   | Line shape only: the dash direction                                |
| `seriesIndex` | `number`                                          | —                | Series this annotation belongs to, by position (see below)        |
| `interactive` | `boolean`                                         | `false`          | Opt in to hover/click: the annotation appears in `scene.annotationPoints` |
| `label`       | `string`                                          | —                | Accessible name for an interactive annotation                     |

Notes:

- Per-chart mapping: on `line`/`area`/`lines`, `x` is the data index
  (fractional indices interpolate along the index axis) and `y` is the data
  value on the chart's domain — on `lines` that domain is shared across all
  series. On `bar`, `x` is the category index (an integer) and `y` is the
  value on the shared value domain; on horizontal bars the logical `x`/`y`
  stay as specified and the renderer swaps the axes. On `scatter`, `x` and
  `y` are data values. On `donut`/`gauge`, `x` is ignored and `y` maps to
  an angle as `startAngle + (y / domain) × span` — domain `max` in gauge
  mode, total in segmented donut mode, `[min, max]` on `gauge` — with the
  mark centered on the ring at mid-thickness radius. On `radar`, `x` is the
  axis index (fractional indices interpolate the angle) and `y` is the value
  on the shared domain ceiling. On `heatmap`, `x` is the column index and
  `y` the row index (both integers), placed at the cell center. On
  `pictogram`, `x` is the series index and `y` the 1-based block number
  (matching `scene.points`' `blockNumber`), centered on that block's slot;
  horizontal pictograms keep the logical coordinates. On `bullet`, `x` is
  the value on `[0, max]` and `y` is ignored, placed on the centerline. On
  `winLoss`, `x` is the data index (an integer) and `y` is ignored, placed
  at the center of that index's block (upper half win, lower half loss,
  centerline zero).
- Series targeting: `seriesIndex` names a series by position, matching
  `scene.points`' `seriesIndex`. On `lines` and `radar` it tags the
  annotation with the series and defaults its color to that series' color;
  position is unchanged because the scale is shared. On grouped `bar` it
  additionally moves the annotation onto that sub-bar; stacked and single
  bars keep the category center. On charts without series, any
  `seriesIndex` drops the annotation, as does one naming no series on that
  chart (including a series absent from one ragged bar column).
- Out-of-range annotations are dropped, not clamped: an `x` outside the
  data (or a non-integer `x` on `bar`/`heatmap`/`pictogram`/`winLoss`), or
  a `y` outside the chart's domain, renders nothing. Unknown shapes and
  `emoji` annotations without an `emoji` are likewise dropped, never
  throwing.
- The `line` shape here is a small dash at the point, not a full-span
  reference line — see Reference lines below.
- React components accept the same `annotations` prop; the marks render
  through the shared `Marks` renderer. Only `interactive: true`
  annotations get hit targets, via the `onAnnotationHover` /
  `onAnnotationClick` props (same `hitRadius` as data points, default 4);
  an interactive annotation's `label` becomes its accessible name. The
  chart description is unchanged by annotations.

## Reference lines

`line`, `area`, `lines`, `bar`, and `scatter` accept an optional
`referenceLines` option: full-span lines across the plot area, drawn above
the data and axes but below the annotations. A reference line never
rescales the chart, and an out-of-domain value is dropped like an
annotation. Lines carry the
`nc-reference-line nc-reference-line-{i}` classes, where `i` is the line's
position in the input array.

```ts
line([3, 7, 2, 9, 5, 6], {
  referenceLines: [
    { value: 7, orientation: 'horizontal', style: 'dashed', color: '#ef4444' },
    { value: 3, orientation: 'vertical', style: 'dotted' },
  ],
});
```

| Option        | Type                                  | Default         | Description                                                        |
| ------------- | ------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `value`       | `number`                              | (required)      | Position on the perpendicular axis's scale (see below)             |
| `orientation` | `'horizontal' \| 'vertical'`          | (required)      | `'horizontal'` draws at `y = value` spanning the plot width; `'vertical'` draws at `x = value` spanning the plot height |
| `color`       | `string`                              | chart's `color` | Line color                                                         |
| `thickness`   | `number`                              | `1`             | Line width                                                         |
| `style`       | `'solid' \| 'dashed' \| 'dotted'`     | `'solid'`       | Dash style, via the shared dash mapping                            |

Notes:

- The coordinate is read on the perpendicular axis's scale: on a
  horizontal bar chart, a horizontal line's position is a category index
  (an integer) and a vertical line's is a value; on every other cartesian
  chart, horizontal lines take values and vertical lines take indices
  (fractional indices interpolate, as with annotations; bar categories
  stay integer-only).
- Lines span the plot box only, never the padding, and are not available
  on donut, gauge, radar, heatmap, pictogram, bullet, or winLoss — a
  radial or cell-grid reference is a different feature.

## Charts

### `line(data, options?)` — trend sparkline

```ts
line([4, 9, 2, 7, 5], { strokeWidth: 1.5, dot: 'last' });
```

| Option                   | Type                            | Default  | Description                            |
| ------------------------ | ------------------------------- | -------- | -------------------------------------- |
| `mode`                   | `'linear' \| 'spline'`          | `'linear'` | Straight segments or smooth curve      |
| `dot`                    | `'none' \| 'last' \| 'all'`     | `'none'` | Dot markers on the line                |
| `strokeWidth`            | `number`                        | `1`      | Line thickness                         |
| `dotRadius`              | `number`                        | `1`      | Dot radius                             |
| `strokeDasharray`        | `string \| number[]`            | —        | Dash pattern, e.g. `'4 2'` or `[4, 2]` |
| `strokeLinecap`          | `'butt' \| 'round' \| 'square'` | —        | Line-cap style                         |
| `value` / `label` / `id` | accessors                       | —        | For custom object arrays               |

A single point renders as a dot instead of a degenerate line.

### `area(data, options?)` — filled trend

Same input as `line`.

| Option                   | Type      | Default | Description                  |
| ------------------------ | --------- | ------- | ---------------------------- |
| `strokeWidth`            | `number`  | `1`     | Top-edge line thickness      |
| `fillOpacity`            | `number`  | `0.2`   | Fill opacity under the curve |
| `value` / `label` / `id` | accessors | —       | For custom object arrays     |

### `lines(series, options?)` — multi-series overlay

Several series drawn on one shared scale.

```ts
lines([
  { data: [4, 9, 2], name: 'Web', color: '#2563eb', dot: 'last' },
  { data: [7, 3, 8], name: 'Mobile' }, // colored from the categorical palette
]);
```

Each series is `{ data, name?, color?, strokeWidth?, strokeDasharray?,
strokeLinecap?, dot?, dotRadius? }` plus `value`/`label`/`id` accessors for
custom objects. `options` is just `BaseOptions`.

**Color precedence:** explicit per-series `color` → uniform `options.color` (only
when the caller passed one) → algorithmic categorical palette. The palette is
positional — a pure function of `(seriesIndex, seriesCount)` — so colors can
shift if the series count changes.

### `bar(data, options?)` — magnitude bars: simple, stacked, grouped, or waterfall

```ts
bar([4, 9, 2]); // simple bars
bar([
  [4, 1],
  [9, 3],
  [2, 5],
]); // stacked: one inner array per column
bar(data, { horizontal: true }); // horizontal orientation
bar([120, -45, 60], { mode: 'waterfall', upColor: 'green', downColor: 'red' }); // cumulative steps
```

Each column is a number, an object point (`{ value, label?, id?, color? }`), a
custom object (with accessors), or — for stacked columns — an array of those.
Stacked segments fall back to the categorical palette when no color is given.

| Option                   | Type                            | Default                | Description                                     |
| ------------------------ | ------------------------------- | ---------------------- | ----------------------------------------------- |
| `gap`                    | `number`                        | `0.2`                  | Fraction of the slot left empty between columns |
| `radius`                 | `number`                        | —                      | Corner radius (`rx`) on bars                    |
| `horizontal`             | `boolean`                       | `false`                | Draw bars left-to-right instead of bottom-up    |
| `mode`                   | `'stacked' \| 'grouped' \| 'waterfall'` | `'stacked'`    | Segment layout: piled, side-by-side, or cumulative |
| `track`                  | `boolean \| BarTrackOptions`    | —                      | Background track behind each bar spanning the full value domain |
| `upColor`                | `string`                        | chart `color`          | Waterfall: column color for positive deltas     |
| `downColor`              | `string`                        | chart `color`          | Waterfall: column color for negative deltas     |
| `total`                  | `boolean`                       | `false`                | Waterfall: append a total column (0 → grand total) |
| `totalColor`             | `string`                        | chart `color`          | Waterfall: color of the total column            |
| `connectors`             | `boolean`                       | `true`                 | Waterfall: solid connectors between columns     |
| `connectorColor`         | `string`                        | chart `color`          | Waterfall: color of the connector lines         |
| `colorAccessor`          | `(row, i) => string`            | —                      | Per-row color for custom object arrays          |
| `value` / `label` / `id` | accessors                       | —                      | For custom object arrays                        |

`track: true` draws one background rect per column (base color at 15%
opacity) behind the bars — the "100%" reference for progress-style bars.
`track: { max, color, opacity, radius }` tunes it: `max` extends the value
domain when larger than the data max, and `radius` defaults to the bar's own
`radius` so rounded caps match. Tracks are decorative (no points).

`mode: 'waterfall'` draws cumulative columns: each bar starts where the
previous one ended, so `[3, 2, -1]` renders as 0→3, 3→5, 5→4. The input values
are the deltas (nested arrays sum to one net step per column); the value domain
spans the running totals. Steps are colored by delta sign via `upColor` /
`downColor` (an explicit per-datum `color` still wins, and omitting both keeps
the single chart `color`). `total: true` appends a final column spanning 0 to
the grand total, and `connectors` (default `true`) draws thin solid lines at
the level where each column ends and the next begins, spanning the full width
of both columns; `connectorColor` sets their color (default: the chart color).
Works horizontally too.

### `winLoss(data, options?)` — direction / sign

One slim bar per value: up for non-negative, down for negative.

| Option                   | Type      | Default                            | Description                                  |
| ------------------------ | --------- | ---------------------------------- | -------------------------------------------- |
| `gap`                    | `number`  | `0.2`                              | Fraction of the slot left empty between bars |
| `winColor`               | `string`  | `options.color` → `'currentColor'` | Color for zero and positive values           |
| `lossColor`              | `string`  | `options.color` → `'currentColor'` | Color for negative values                    |
| `value` / `label` / `id` | accessors | —                                  | For custom object arrays                     |

When no explicit win/loss colors are given, losses render at 40% opacity so
they still read as distinct from wins.

### `bullet(data, options?)` — value vs. target

```ts
bullet({ value: 72, target: 80, ranges: [50, 75, 100] });
```

`data` is `{ value, target, ranges?, max?, id?, label? }`. `ranges` are
background bands (sorted automatically); `max` defaults to the largest of
`value`, `target`, and the ranges. `options` is just `BaseOptions`.

### `donut(data, options?)` — proportion

Two modes:

```ts
donut({ value: 62, max: 100 });              // gauge ring
donut([30, 50, 20]);                         // segments
donut([{ value: 30, label: 'A', color: '#e11d48' }, …]); // labeled + colored
```

Segments render as stroked arcs (never a fill plus an inherited stroke).
Uncolored segments fall back to the categorical palette; the alternating
opacity stripe used for uniform-color segments is suppressed once segments
have real colors.

| Option                   | Type                            | Default               | Description                                            |
| ------------------------ | ------------------------------- | --------------------- | ------------------------------------------------------ |
| `thickness`              | `number`                        | `35%` of outer radius | Ring thickness                                         |
| `startAngle`             | `number`                        | `-90`                 | Where the first segment starts, in degrees             |
| `endAngle`               | `number`                        | `startAngle + 360`    | Where the dial ends — a smaller span makes a partial dial (e.g. `135` → `405`) |
| `centerLabel`            | `string \| (ctx) => string`     | —                     | Text at the dial's center; `ctx` is `{ value, min, max, frac }` |
| `colors`                 | `string[]`                      | —                     | Per-segment colors for `number[]` input, index-matched |
| `strokeLinecap`          | `'butt' \| 'round' \| 'square'` | —                     | Cap style on segment arcs                              |
| `gap`                    | `number`                        | `0.2`                 | Gap between segments, in user units (≈1px hairline at typical display sizes); each segment is inset by half the gap on both ends. `0` renders touching segments. Segmented mode only (ignored in gauge mode) |
| `track`                  | `boolean \| DonutTrackOptions`  | —                     | Background ring behind the segments                    |
| `colorAccessor`          | `(row, i) => string`            | —                     | Per-row color for custom object arrays                 |
| `value` / `label` / `id` | accessors                       | —                     | For custom object arrays                               |

`track: true` (or `track: { color, opacity }`) draws a background
ring behind segmented arcs — the "100%" reference. In gauge mode the ring
already exists: the option customizes its color/opacity, and `track: false`
hides it. Tracks are decorative (no points).

In gauge mode, `centerLabel` receives `{ value, min: 0, max, frac }`; in
segmented mode it receives `{ value: total, min: 0, max: total, frac: 1 }`.

### `gauge(data, options?)` — dial gauge

```ts
gauge({ value: 72, max: 100 });                                        // arc mode (default)
gauge({ value: 72, max: 100 }, { mode: 'needle', zones: [              // needle + zones
  { to: 60, color: '#4ade80' }, { to: 85, color: '#facc15' }, { to: 100, color: '#f87171' },
]});
gauge({ value: 72, max: 100 }, { centerLabel: ({ frac }) => `${Math.round(frac * 100)}%` });
```

`data` is `{ value, max }`. Two modes: `'arc'` sweeps a foreground arc to
the value; `'needle'` points a needle at the value over the dial. The dial
defaults to the classic 270° sweep (`135°` → `405°`).

| Option          | Type                            | Default            | Description                                                              |
| --------------- | ------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| `min`           | `number`                        | `0`                | Domain minimum                                                           |
| `mode`          | `'arc' \| 'needle'`             | `'arc'`            | Value shown as sweeping arc, or needle over the dial                     |
| `startAngle`    | `number`                        | `135`              | Dial start, in degrees (0° = east, clockwise positive)                   |
| `endAngle`      | `number`                        | `startAngle + 270` | Dial end                                                                 |
| `thickness`     | `number`                        | `35%` of outer radius | Dial thickness                                                        |
| `track`         | `boolean \| DonutTrackOptions`  | on                 | Background dial (`false` hides it; ignored when `zones` are given)       |
| `zones`         | `GaugeZone[]`                   | —                  | Colored dial bands `{ to, color, opacity? }`; background in arc mode, the dial itself in needle mode |
| `needle`        | `'line' \| 'triangle'`          | `'triangle'`       | Needle shape (needle mode)                                               |
| `needleColor`   | `string`                        | chart color        | Needle and hub color                                                     |
| `centerLabel`   | `string \| (ctx) => string`     | —                  | Center readout; `ctx` is `{ value, min, max, frac }` (below center in needle mode) |
| `strokeLinecap` | `'butt' \| 'round' \| 'square'` | —                  | Cap style on the value arc, track, and zone bands (background ends always match the value arc) |

Values outside `[min, max]` clamp to the dial ends; a bad domain (or bad
`endAngle`) falls back gracefully and still renders the dial.

### `scatter(data, options?)` — 2D relationship

```ts
scatter([
  [0, 1],
  [2, 3],
  [4, 2],
]); // [x, y] pairs
scatter(users, { x: (u) => u.age, y: (u) => u.spend }); // custom objects
```

Accepts `[x, y][]`, `{ x, y, id?, label? }[]`, or custom objects with `x` / `y`
/ `label` / `id` accessors. Point labels default to `"x, y"`.

| Option   | Type     | Default | Description  |
| -------- | -------- | ------- | ------------ |
| `radius` | `number` | `1`     | Point radius |

### `heatmap(matrix, options?)` — intensity grid

```ts
heatmap(
  [
    [1, 4, 2],
    [3, 0, 5],
  ],
  { cellSize: 20, gap: 2 },
);
```

`matrix` is `number[][]` (or `T[][]` with a `value` accessor). The grid
auto-sizes to the widest row — ragged input lays out consistently and missing
cells are skipped rather than throwing.

| Option       | Type                             | Default | Description                                                           |
| ------------ | -------------------------------- | ------- | --------------------------------------------------------------------- |
| `cellSize`   | `number`                         | `8`     | Cell width/height in user units                                       |
| `gap`        | `number`                         | `1`     | Gap between cells                                                     |
| `radius`     | `number`                         | —       | Corner radius on cells                                                |
| `colorScale` | `[string, string] \| ColorScale` | —       | Maps value extent to color; defaults to a single-color intensity ramp |
| `value`      | `(cell, row, col) => number`     | —       | For custom cell objects                                               |

### `radar(input, options?)` — multi-axis spider chart

```ts
radar([4, 9, 2, 7, 5]); // single series, five axes
radar([
  { data: [4, 9, 2], name: 'Web', fill: 0.3 },
  { data: [7, 3, 8], name: 'Mobile', color: '#2563eb', dot: 'all' },
]);
```

Each series is `{ data, name?, color?, strokeWidth?, strokeDasharray?,
strokeLinecap?, fill?, dot?, dotRadius? }` plus `value`/`label`/`id` accessors
for custom objects. Axes are shared across series: angles start at the top
(-90°) and sweep clockwise, radii scale to `[0, max]` where `max` defaults to
the largest value. A decorative spider grid (spokes + quarter rings) is on by
default; no labels or legend are rendered — use hover/click points for values.

| Option                   | Type                            | Default  | Description                                        |
| ------------------------ | ------------------------------- | -------- | -------------------------------------------------- |
| `max`                    | `number`                        | data max | Domain ceiling; values above it clamp to the rim   |
| `grid`                   | `boolean`                       | `true`   | Spider grid (spokes + rings)                       |
| `gridColor`              | `string`                        | chart color | Grid stroke color                               |
| `gridOpacity`            | `number`                        | `0.15`   | Grid stroke opacity, 0–1                            |
| `fill`                   | `boolean \| number`             | `true`   | Polygon fill: `true` → 0.2 opacity, number → opacity |
| `dot`                    | `'none' \| 'all'`               | `'none'` | Dot markers on the vertices                        |
| `dotRadius`              | `number`                        | `1`      | Dot radius                                         |
| `strokeWidth`            | `number`                        | `1`      | Polygon edge thickness                             |
| `strokeDasharray`        | `string \| number[]`            | —        | Dash pattern, e.g. `'4 2'` or `[4, 2]`             |
| `strokeLinecap`          | `'butt' \| 'round' \| 'square'` | —        | Line-cap style                                     |
| `value` / `label` / `id` | accessors                       | —        | For custom object arrays (single-series shorthand) |

Series shorter than the longest are padded with zero-valued points; a
single-axis input renders as a dot. **Color precedence:** explicit per-series
`color` → uniform `options.color` (only when the caller passed one) →
algorithmic categorical palette, the same rule `lines()` uses.

### `pictogram(data, options?)` — countable unit blocks

```ts
pictogram([3, 7, 5]); // three columns of 3, 7, 5 blocks
pictogram([3, 7, 5], { block: { kind: 'circle' }, horizontal: true });
pictogram([4.5], { block: { kind: 'emoji', emoji: '⭐' } }); // 4 full + 1 half star
```

Each entry is one column (vertical) or row (horizontal) of uniform blocks —
squares, dots, or emoji — where the **count** of blocks is the value. No axes;
the units are countable. Entries accept `{ value, label?, color?, filled?,
blockStyles? }` objects plus `value`/`label`/`id`/`colorAccessor`/`filledAccessor`
accessors for custom objects.

The block shape is defined once in `<defs>` and stamped with `<use>`, keeping
output small. Fractional counts render a **partial block**, review-stars
style: the full shape at 25% opacity (the "empty slot") with the filled
fraction clipped on top. Blocks are fixed-size, so the scene sizes itself to
the data (like `heatmap()` with `cellSize`); one hover/click point is emitted
per block, carrying `col`, `blockNumber`, `blocksTotal`, `partial`, and `empty`.

| Option                   | Type                                              | Default      | Description                                                              |
| ------------------------ | ------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `block`                  | `PictogramBlock`                                  | `{ kind: 'rect' }` | Block shape: `{ kind: 'rect', radius? }`, `{ kind: 'circle' }`, or `{ kind: 'emoji', emoji }` |
| `blockSize`              | `number`                                          | `8`          | Block edge in px                                                         |
| `gap`                    | `number`                                          | `0.25`       | Space between blocks (and columns/rows) as a fraction of `blockSize`, like `bar()` |
| `horizontal`             | `boolean`                                         | `false`      | Rows stack left→right instead of columns bottom-up                        |
| `unit`                   | `number`                                          | `1`          | Data value per block; count = `value / unit`                             |
| `filled`                 | `number`                                          | `value`      | Filled leading blocks for every series (in data units, like `value`); the rest render as empty — datum-level `filled` wins |
| `filledAccessor`         | `(datum, index) => number`                         | —            | Per-row filled counts for custom object arrays                           |
| `emptyColor`             | `string`                                          | block's base color | Paint for empty (unfilled) blocks                                  |
| `emptyVariant`           | `'solid' \| 'ring'`                               | `'solid'`    | How empty blocks render: `'solid'` dims the block, `'ring'` draws only its border |
| `blockStyles`            | `PictogramBlockStyle[]`                           | —            | Span-based per-block styling applied to every series, in order; datum-level `blockStyles` apply after these |
| `connector`              | `PictogramConnectorOptions`                       | —            | Draw lines joining each series' rendered blocks, behind the blocks: by default one line per gap between adjacent non-empty blocks (connectors stop at the last filled block), or explicit `segments` with per-segment spans and styling; skipped for series with fewer than two blocks |
| `idPrefix`               | `string`                                          | auto (`pictogram-N`) | Prefix for `<defs>`/clip ids — unique per chart by default so several pictograms can share a document; pass an explicit value to control the ids |
| `value` / `label` / `id` | accessors                                         | —            | For custom object arrays                                                  |
| `colorAccessor`          | `(datum, index) => string \| undefined`           | —            | Per-column color accessor                                                |

Bad values follow the clamp policy: negatives and non-finite values render
zero blocks; a non-positive or non-finite `unit` falls back to `1`.
**Color precedence:** explicit per-datum `color` → uniform `options.color` →
the pastel block palette (`#8fe6c4`, `#7fd8e6`, `#f3a8c7`, `#c6a6e8`, `#f0dd82`,
cycling), from the same precedence rule `bar()`/`donut()` use.

`connector` takes `{ color?, thickness?, style?, linecap?, segments? }`: `color` defaults to
the earlier block's resolved color (so each gap continues the block it leaves),
`thickness` defaults to `2` (px; non-positive or non-finite values fall back to
`2`), and `style` is `'solid' | 'dashed' |
'dotted'` (defaults to `'solid'`, sharing the axis gridline dash vocabulary).
`linecap` is `'butt'` or `'round'`: butt caps end flush at the block
edges so connectors look merged into the blocks, and is the default —
except for `'dotted'` connectors, which default to `'round'` so the dots
render as dots instead of thin slivers. An explicit `linecap` always wins. Each gap between adjacent
blocks gets its own line, running edge to edge between the blocks — never through
a block's interior, so hollow rings stay clean — with the dash pattern restarting
at every block so `dashed`/`dotted` render as uniform connectors. By default only
gaps between filled (or partial) blocks render, so connectors stop at the last
filled block instead of running through empty ones; explicit `segments` render
exactly as specified.

Pass `segments` for explicit spans with per-segment styling:

```ts
pictogram([6, 6], {
  connector: {
    thickness: 3,
    segments: [
      { span: [0, 2], color: '#f76e6e' },
      { span: [2, 5], color: '#52e081', style: 'dashed' },
    ],
  },
});
```

Each segment's `span` holds the block indices at its two ends, inclusive —
the line runs from the center of `span[0]` to the center of `span[1]`
(direction does not matter). Out-of-range indices are clamped to the rendered
blocks and zero-length spans are skipped. Long spans are subdivided per gap so
dash patterns stay uniform. When `segments` is present, only those render, in
order (later entries draw over earlier ones); omitted `color`/`thickness`/`style`
fields fall back to the connector-level values.

**Per-block styling.** `value` sets the block count (capacity); `filled` sets how
many leading blocks are filled, and the rest render as empty — the stage-completion
primitive:

```ts
pictogram(
  [
    { value: 4, filled: 2, label: 'Flow A' },
    { value: 4, filled: 3, label: 'Flow B' },
  ],
  {
    color: '#52e081',
    emptyColor: '#e5e5e5',
    emptyVariant: 'ring', // or 'solid' (dimmed, the default)
    connector: { thickness: 3 },
  },
);
```

`filled` is in data units like `value` (so it honors `unit`), clamps to
`[0, value]`, and accepts fractions — `filled: 2.5` renders the transitional
block with the partial-block treatment. Empty blocks emit points with `value: 0`
and `empty: true`.

For arbitrary paint, `blockStyles` takes span rules — `{ span, color?, stroke?,
strokeWidth?, variant?, block? }` — sharing the `span` vocabulary with connector
`segments` (inclusive, clamped, direction-free). Rules apply in order, later
rules winning per field; options-level rules apply first, then datum-level ones:

```ts
pictogram([{ value: 8, color: 'grey' }], {
  blockStyles: [
    { span: [0, 1], color: '#f76e6e' },
    { span: [2, 3], block: { kind: 'emoji', emoji: '⭐' } },
    { span: [4, 5], variant: 'ring' },
    { span: [6, 6], color: '#52e081', stroke: '#1a7a3c', strokeWidth: 2 },
  ],
});
```

`variant: 'ring'` draws only the border (fill `none`, stroke in the color);
`stroke`/`strokeWidth` add a border to solid blocks. A rule's `block` overrides
the shape for its span (each distinct shape gets one shared `<defs>` entry).
Per-block resolution order: series base color → `filled`/empty treatment →
`blockStyles` rules. Rings on emoji fall back to the dimmed treatment, since
stroked text renders poorly.

## Rendering

### `toSVG(scene, opts?)`

Serializes a `Scene` to an SVG string. Safe to embed anywhere — attribute
values are escaped and custom attribute names are validated.

```ts
toSVG(scene, { className: 'spark', attrs: { role: 'img' } });
```

| Opt         | Type                               | Description                                   |
| ----------- | ---------------------------------- | --------------------------------------------- |
| `className` | `string`                           | Merged into the `<svg>` class with `nc-chart` and the scene's `class` option |
| `style`     | `string`                           | Added as the `style` attribute on `<svg>`     |
| `attrs`     | `Record<string, string \| number>` | Extra attributes on `<svg>` (names validated) |

Rendered dot circles carry `data-index` / `data-series` attributes, so
hit-testing a point needs no coordinate reverse-mapping — the DOM node names
its own point index.

### React components

`LineNanoChart`, `AreaNanoChart`, `BarNanoChart`, `WinLossNanoChart`, `BulletNanoChart`,
`DonutNanoChart`, `ScatterNanoChart`, `HeatmapNanoChart`, `RadarNanoChart`, `PictogramNanoChart` — each takes the same `data` (`series` for `RadarNanoChart`) and
options as its core function, plus interactivity props:

| Prop                  | Type                                  | Description                                                           |
| --------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `onPointHover`        | `(point: ScenePoint \| null) => void` | Fires with the point on hover enter, `null` on leave                  |
| `onPointClick`        | `(point: ScenePoint) => void`         | Fires on click with the point                                         |
| `hitRadius`           | `number` (default `4`)                | Invisible hover/click target radius around each point, in chart units |
| `className` / `style` | standard React props                  | Passed to the root `<svg>`                                            |

No tooltip UI ships with the package — build your own from the callback data.
Every component sets `'use client'` (Next.js App Router compatible) and works
with React 17+. Components are also available as subpath imports, e.g.
`@samirdamle/nano-charts-react/bar`.

## Accessibility

Every chart ships an a11y summary (`<title>` + `<desc>`): chart kind, point
count, and value range. Override per chart with `title` / `desc`. Charts are
deterministic — no layout randomness — so SSR output matches the client.

## Bundle size

Zero runtime dependencies in core; React is a peer dependency of the React
package. Import one chart per subpath to ship only what you use — the bundler
tree-shakes the rest. Size budgets are enforced in CI (`pnpm size`, via
size-limit); all figures below are minified + gzip.

**Enforced budgets (measured 2026-10-26):**

| Entry                                                    | Budget  | Measured    |
| -------------------------------------------------------- | ------- | ----------- |
| `@samirdamle/nano-charts` — `line` standalone            | 5 kB    | **4.84 kB** |
| `@samirdamle/nano-charts` — `toSVG` standalone           | 1.25 kB | **1.05 kB** |
| `@samirdamle/nano-charts` — full barrel                  | 15.5 kB | **15.32 kB** |
| `@samirdamle/nano-charts-react` — `LineNanoChart` standalone | 6 kB    | **5.80 kB** |
| `@samirdamle/nano-charts-react` — full barrel            | 15 kB   | **14.96 kB** |

**One chart + `toSVG` (the realistic per-chart cost):**

| Chart      | Size    |
| ---------- | ------- |
| `line`     | 5.79 kB |
| `area`     | 5.54 kB |
| `lines`    | 5.77 kB |
| `bar`      | 6.83 kB |
| `win-loss` | 2.81 kB |
| `bullet`   | 2.49 kB |
| `donut`    | 3.86 kB |
| `gauge`    | 3.06 kB |
| `scatter`  | 5.20 kB |
| `heatmap`  | 5.10 kB |
| `radar`    | 3.50 kB |
| `pictogram`| 4.73 kB |

Positioning: nano-charts is built for the case where a page renders _hundreds_
of tiny charts — table cells, metric cards, dashboards of sparklines — where
per-chart byte cost dominates. A single chart plus its renderer stays around
2.5–6.8 kB; the whole core library (all twelve charts plus `toSVG`) is 15.3 kB gzipped,
roughly the cost of one small image. The budgets above are hard CI gates, so the
library can't silently grow past them.
