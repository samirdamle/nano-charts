# @samirdamle/nano-charts-react

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
