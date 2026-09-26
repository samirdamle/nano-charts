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
import { LineChart } from '@samirdamle/nano-charts-react';

<LineChart data={[4, 9, 2, 7, 5]} dot="last" onPointClick={(p) => console.log(p)} />;
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
| `padding` | `number \| { top?, right?, bottom?, left? }` | `1` all sides (heatmap: `0`) | Inner padding in user units                           |
| `title`   | `string`                                     | per-chart default            | `<title>` for screen readers                          |
| `desc`    | `string`                                     | per-chart default            | `<desc>` for screen readers                           |

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

### `bar(data, options?)` — magnitude bars, simple or stacked

```ts
bar([4, 9, 2]); // simple bars
bar([
  [4, 1],
  [9, 3],
  [2, 5],
]); // stacked: one inner array per column
bar(data, { horizontal: true }); // horizontal orientation
```

Each column is a number, an object point (`{ value, label?, id?, color? }`), a
custom object (with accessors), or — for stacked columns — an array of those.
Stacked segments fall back to the categorical palette when no color is given.

| Option                   | Type                            | Default                | Description                                     |
| ------------------------ | ------------------------------- | ---------------------- | ----------------------------------------------- |
| `gap`                    | `number`                        | `0.2`                  | Fraction of the slot left empty between columns |
| `radius`                 | `number`                        | —                      | Corner radius (`rx`) on bars                    |
| `horizontal`             | `boolean`                       | `false`                | Draw bars left-to-right instead of bottom-up    |
| `track`                  | `boolean \| BarTrackOptions`    | —                      | Background track behind each bar spanning the full value domain |
| `colorAccessor`          | `(row, i) => string`            | —                      | Per-row color for custom object arrays          |
| `value` / `label` / `id` | accessors                       | —                      | For custom object arrays                        |

`track: true` draws one background rect per column (base color at 15%
opacity) behind the bars — the "100%" reference for progress-style bars.
`track: { max, color, opacity, radius }` tunes it: `max` extends the value
domain when larger than the data max, and `radius` defaults to the bar's own
`radius` so rounded caps match. Tracks are decorative (no points).

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
the units are countable. Entries accept `{ value, label?, color? }` objects
plus `value`/`label`/`id`/`colorAccessor` accessors for custom objects.

The block shape is defined once in `<defs>` and stamped with `<use>`, keeping
output small. Fractional counts render a **partial block**, review-stars
style: the full shape at 25% opacity (the "empty slot") with the filled
fraction clipped on top. Blocks are fixed-size, so the scene sizes itself to
the data (like `heatmap()` with `cellSize`); one hover/click point is emitted
per block, carrying `col`, `blockNumber`, `blocksTotal`, and `partial`.

| Option                   | Type                                              | Default      | Description                                                              |
| ------------------------ | ------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `block`                  | `PictogramBlock`                                  | `{ kind: 'rect' }` | Block shape: `{ kind: 'rect', radius? }`, `{ kind: 'circle' }`, or `{ kind: 'emoji', emoji }` |
| `blockSize`              | `number`                                          | `8`          | Block edge in px                                                         |
| `gap`                    | `number`                                          | `0.25`       | Space between blocks (and columns/rows) as a fraction of `blockSize`, like `bar()` |
| `horizontal`             | `boolean`                                         | `false`      | Rows stack left→right instead of columns bottom-up                        |
| `unit`                   | `number`                                          | `1`          | Data value per block; count = `value / unit`                             |
| `idPrefix`               | `string`                                          | auto (`pictogram-N`) | Prefix for `<defs>`/clip ids — unique per chart by default so several pictograms can share a document; pass an explicit value to control the ids |
| `value` / `label` / `id` | accessors                                         | —            | For custom object arrays                                                  |
| `colorAccessor`          | `(datum, index) => string \| undefined`           | —            | Per-column color accessor                                                |

Bad values follow the clamp policy: negatives and non-finite values render
zero blocks; a non-positive or non-finite `unit` falls back to `1`.
**Color precedence:** explicit per-datum `color` → uniform `options.color` →
the pastel block palette (`#8fe6c4`, `#7fd8e6`, `#f3a8c7`, `#c6a6e8`, `#f0dd82`,
cycling), from the same precedence rule `bar()`/`donut()` use.

## Rendering

### `toSVG(scene, opts?)`

Serializes a `Scene` to an SVG string. Safe to embed anywhere — attribute
values are escaped and custom attribute names are validated.

```ts
toSVG(scene, { className: 'spark', attrs: { role: 'img' } });
```

| Opt         | Type                               | Description                                   |
| ----------- | ---------------------------------- | --------------------------------------------- |
| `className` | `string`                           | Added as the `class` attribute on `<svg>`     |
| `style`     | `string`                           | Added as the `style` attribute on `<svg>`     |
| `attrs`     | `Record<string, string \| number>` | Extra attributes on `<svg>` (names validated) |

Rendered dot circles carry `data-index` / `data-series` attributes, so
hit-testing a point needs no coordinate reverse-mapping — the DOM node names
its own point index.

### React components

`LineChart`, `AreaChart`, `BarChart`, `WinLossChart`, `BulletChart`,
`DonutChart`, `ScatterChart`, `HeatmapChart`, `RadarChart`, `PictogramChart` — each takes the same `data` (`series` for `RadarChart`) and
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
size-limit); all figures below are minified + Brotli.

**Enforced budgets (measured 2026-09-21):**

| Entry                                                    | Budget | Measured    |
| -------------------------------------------------------- | ------ | ----------- |
| `@samirdamle/nano-charts` — `line` standalone            | 1.5 kB | **1.19 kB** |
| `@samirdamle/nano-charts` — `toSVG` standalone           | 1 kB   | **878 B**   |
| `@samirdamle/nano-charts` — full barrel                  | 9 kB   | **7.36 kB** |
| `@samirdamle/nano-charts-react` — `LineChart` standalone | 2 kB   | **1.89 kB** |
| `@samirdamle/nano-charts-react` — full barrel            | 12 kB  | **7.27 kB** |

**One chart + `toSVG` (the realistic per-chart cost):**

| Chart      | Size    |
| ---------- | ------- |
| `line`     | 1.98 kB |
| `area`     | 1.93 kB |
| `lines`    | 2.07 kB |
| `bar`      | 2.38 kB |
| `win-loss` | 1.83 kB |
| `bullet`   | 1.52 kB |
| `donut`    | 2.24 kB |
| `gauge`    | 1.26 kB |
| `scatter`  | 1.54 kB |
| `heatmap`  | 1.74 kB |
| `radar`    | 2.34 kB |
| `pictogram`| 2.33 kB |

Positioning: nano-charts is built for the case where a page renders _hundreds_
of tiny charts — table cells, metric cards, dashboards of sparklines — where
per-chart byte cost dominates. A single chart plus its renderer stays around
2 kB; the whole core library (all twelve charts plus `toSVG`) is 7.36 kB, roughly
the cost of one small image. The budgets above are hard CI gates, so the
library can't silently grow past them.
