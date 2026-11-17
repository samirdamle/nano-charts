# nano-charts plots — return geometry data alongside the SVG

Status: strategy approved (Samir, 2026-11-15). Issue #216. Plan doc only —
no code in this PR.

## Goal

Add an option to return the plots — the points, lengths, and other computed
geometry, in data form — apart from the SVG code. Available for every chart
type (all 12).

## Decisions (Samir, 2026-11-15 — all five recommendations accepted)

1. **Opt-in, non-breaking.** New `plots?: boolean` option; `line(data,
   { plots: true })` returns `Scene & { plots: LinePlots }` via overloads,
   `line(data)` still returns plain `Scene`. No breaking change, deliberately
   NOT held for 1.0.
2. **Coordinate convention:** pixel geometry plus datum identity (`value`,
   `index`, `label`, `seriesIndex`) on every element, plus a `frame` so the
   payload is self-contained. Plots carry primitives, not every derivable
   scalar.
3. **React:** `onPlots?: (plots) => void` callback prop, following the
   existing `onPointHover` / `onAnnotationClick` pattern. Core-direct usage
   stays available.
4. **Annotations and reference lines are excluded** from plots — overlays
   with their own channels (`scene.points`, `annotationPoints`); plots are
   the chart's own data geometry.
5. **Ship as a 0.8 minor** (core minor + React minor changesets), not held
   for 1.0. The plots schema becomes part of the frozen API at 1.0, so it is
   designed carefully now.
6. **Amendment (Samir, 2026-11-15): plots elements also carry their
   resolved color.** Every plots element carries the `color` its mark
   renders with — series color, segment color, the color-scale output for
   heatmap cells, the resolved main color for pictogram blocks. Colors are
   styling, but they belong in the payload because custom tooltips and
   legends built from plots need them.

## Why no breaking change is needed

Every core chart function returns a `Scene` — `{ width, height, viewBox,
marks, points, annotationPoints?, a11y, svgClass? }` — and `toSVG(scene)`
only reads `viewBox`, `marks`, `a11y`, and `svgClass`. It never spreads the
scene, so an extra `plots` key on the object is inert for SVG output. Adding
an *optional* key to a returned object is non-breaking twice over: at
runtime, existing callers ignore keys they don't read; in TypeScript, an
optional property breaks nobody. What *would* break is a *required* key —
anyone hand-building a `Scene` literal (our own React `emptyScene`, user
test fixtures) would fail to compile. So the design rule is: the key is
optional in the type and absent at runtime unless requested.

There is a direct precedent for this exact pattern in the codebase:
`finishScene` attaches `annotationPoints` only when at least one interactive
annotation exists, specifically so scenes without them are byte-identical to
before. Plots use the same conditional-attach in the same function — one
seam, all twelve charts.

The 1.0 alternative was rejected deliberately: a break at 1.0 buys nothing
here and costs real things — every 0.7 consumer re-checks their code for no
benefit, the migration guide carries a pointless breaking item, and 1.0
stops reading as a stability promise. 1.0 is an API freeze, not a feature
count, and #190 found zero breaking-change candidates. Besides, pre-1.0 a
breaking change is a minor bump anyway (0.7 → 0.8), so "save it for 1.0"
doesn't even buy semver cleanliness. If a genuine break ever appears, 1.0
is where it goes — this isn't one.

Known cost of the opt-in design, recorded honestly: when options are passed
as a widened variable (`const opts: LineOptions = { plots: true }`),
TypeScript can't resolve the overload to the plots variant and the caller
gets the plain `Scene`. Mitigation is documentation (pass the literal, or
type the variable with the `plots: true` literal) plus type tests proving
the overloads resolve. A paper cut, not a reason to break everyone.

## How it wires in

- One line on `BaseOptions`: `plots?: boolean`. All twelve options
  interfaces extend `BaseOptions` directly or through `SeriesChartOptions`,
  so the option is available on every chart with no per-chart plumbing.
- One new type module: a discriminated union `Plots`
  (`{ kind: 'line' | 'bar' | ... }`) with one payload interface per chart,
  plus `plots?: Plots` on `Scene`.
- One seam: `finishScene` takes an optional plots argument and attaches it
  only when defined, mirroring `annotationPoints`. Each chart builds its
  plots from the geometry locals it already computed for its marks, gated
  behind `options.plots === true`, so when the option is off there is zero
  extra allocation — one boolean check.
- `toSVG` needs no change. The React wrappers pass options straight through
  to core (they spread the rest props), so `plots: true` reaches core for
  free — but React components return JSX, never the `Scene`, so React users
  need their own route to read the plots (see React below).

Why not the alternatives: always-on plots would be a required `Scene` key
(the breaking option above) and would charge every consumer the allocation.
Separate `linePlots()`-style functions would double the public surface to
24 entry points and risk drift between two layout paths — and plots can't be
derived from a finished `Scene` anyway, because marks are lossy (a spline
is an opaque `d` string, a donut segment is a path). Plots have to be built
where the geometry is computed, i.e. inside the chart functions.

## What "plots" contains

Convention: geometry in **pixels** (the actual rendered geometry) **plus
datum identity** (`value`, `index`, `label`, `seriesIndex`) on every
element, plus a `frame` so the payload is self-contained — `{ width,
height, plot: { x, y, width, height }, xDomain?, yDomain? }` where the
chart has domains. Pure data-space would be useless (the caller already
has its input); pure pixels without values would be half-useful. Lengths
fall out of this: a bar's length is its height/width, a line segment's
length derives from consecutive points — the rule is plots carry
primitives, not every derivable scalar.

Payload rules:

- Plain JSON-serializable numbers only, no functions, no circular refs,
  geometry rounded to 3 decimal places (datum values never rounded).
- Fresh plain objects, never references to internal marks, typed `readonly`
  and documented read-only; no deep-freeze (perf cost for no benefit).
- Built from the same normalized, filtered data as the marks, so dropped
  elements match exactly: ragged heatmap cells absent, out-of-domain values
  absent, bullet clamping reflected.
- Every plots element carries its resolved `color` — the color its mark
  renders with (series color for line/scatter/radar points, segment color
  for bars and donut segments, the color-scale output for heatmap cells,
  the resolved main color for pictogram blocks, the up/down color for
  winLoss blocks, the zone color for gauge zones). `currentColor` stays
  `currentColor`: it is resolved by the consumer's context, not by the
  library.
- Annotations and reference lines are *not* in plots (decision 4 above).

Per-chart payloads:

- **line / lines / area**: per-series `points: { x, y, value, index,
  seriesIndex?, color }[]`; area adds the `baselineY` the fill sits on.
- **bar**: `bars: { x, y, width, height, value, index, seriesIndex?,
  color }[]`, one entry per sub-bar when grouped; horizontal charts keep the
  same shape with axes swapped.
- **scatter**: `points: { x, y, valueX, valueY, index, seriesIndex?,
  color }[]` — both data coordinates and pixels, since scatter input is
  (x, y) pairs.
- **donut**: `segments: { value, fraction, startAngle, endAngle, index,
  label?, color }[]` plus `center`, `innerRadius`, `outerRadius`. Angles in
  degrees, one documented zero/direction convention shared with gauge.
- **gauge**: `value, min, max, frac, needleAngle`, the zones (boundaries +
  color), `center`, `radius`.
- **bullet**: `ranges` (pixel extents + values + color), `value` bar rect,
  `target` marker position.
- **heatmap**: `cells: { row, col, value, x, y, width, height, color }[]`.
- **radar**: per-series `vertices: { axis, value, x, y, seriesIndex?,
  color }[]` plus `center`, `radius`.
- **pictogram**: `blocks: { series, blockNumber, x, y, size, filled, empty,
  partial, color }[]`, plus `connectors: { x1, y1, x2, y2 }[]` when
  connector lines are on.
- **winLoss**: `blocks: { index, value, sign, x, y, width, height,
  color }[]`.

### `scene.points` vs `plots`

`scene.points` already exists. Points are the hit-test/label layer (one
entry per datum, built for hover and a11y). Plots are the rendered geometry
layer (bars, arcs, cells, polygons). They overlap on line/scatter points
and diverge everywhere else — the docs need one paragraph saying exactly
that, or users will (reasonably) ask why there are two per-datum layers.

## React

`renderNanoChart` peels off the interaction props, spreads the rest as core
options, and returns JSX — the `Scene` never escapes to the React user.
Decision 3: an `onPlots?: (plots) => void` callback prop, following the
existing `onPointHover` / `onAnnotationClick` pattern, fired when plots were
computed (i.e. when `plots: true`). Core-direct usage stays available for
advanced users.

Edge case to settle in implementation: data null → React renders its
hand-built empty scene, no plots, callback not fired.

## Other considerations

- **Size budget.** The plots assembly is object-building from existing
  locals, so the cost should be small, but it lands in every chart module
  and the barrel. Re-measure per the standing rule after implementation;
  if the barrel crosses the 15.5 kB budget that is a decision point, not
  something to pre-decide. Types and overloads are erased at build, so they
  cost zero bytes.
- **The plots schema is a 1.0 commitment.** Once 1.0 freezes the API, this
  schema freezes with it. That is an argument for designing it carefully
  now (this document) rather than iterating after 1.0.
- **Naming.** `plots` / `Plots` is free — no existing option, type, or
  export collides. It reads naturally (`{ plots: true }`, `scene.plots`).
- **SSR.** Pure data, no DOM — nothing to do.
- **Docs and demo.** API.md gets a Plots section plus per-chart schema
  tables; README one line + link; demo gets a showcase cell printing a
  chart's plots as JSON (proves the feature visibly, in the
  assert-the-rendered-output spirit). Changesets: core minor, React minor.
  The 1.0 plan doc (`docs/plans/nano-charts-1.0.md`) gets one line noting
  plots as part of the frozen surface.

## Verification

- Differential scene snapshots with the option off (byte-identical), per the
  standing "no functionality lost" rule.
- Golden plots fixtures per chart; type tests for overload resolution;
  `toSVG` output unchanged with plots on; React `onPlots` test; demo cell
  asserting rendered plots JSON.
- Re-measure all bundle-size figures on all surfaces after implementation
  (standing rule).

## Sequencing

Issue #216 first, then branch, then implement — series charts first
(shared seam in `renderSeriesChart` / `seriesLayout`), then the rest in
batches, with differential verification per batch. PRs target `develop`;
Samir reviews/merges; never merge unreviewed.
