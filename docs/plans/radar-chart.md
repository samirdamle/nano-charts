# Radar chart plan

Flexible, robust, but minimal — consistent with the nano-charts core focus.
No data labels, no category labels, no tick labels are rendered; interaction
data travels through `ScenePoint`s (hover/click) only.

## API

Mirrors `lines()`, the closest existing cousin (multi-series overlay,
per-series colors):

```ts
interface RadarSeries<T = number> extends Partial<SeriesAccessors<T>> {
  data: SeriesInput<T>;
  name?: string;              // -> points' seriesLabel
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  fill?: boolean | number;    // fill opacity, default 0.2
  dot?: 'none' | 'all';       // default 'none'
  dotRadius?: number;
}
radar<T>(series: RadarSeries<T>[], options?: RadarOptions): Scene
```

Open question: accept a single-series shorthand `radar([1, 2, 3])`
auto-wrapping to one series, or strictly `radar([{ data: [1,2,3] }])`
like `lines()`?

## Geometry

- Axes = longest series length. Axis *i* sits at `-90° + i·360°/n`.
- Shared domain `[0, max]` across all series; radius `= value/max · R`,
  `R = min(w,h)/2 − padding`. Defaults `100×100` (square, unlike the
  100×20 of the linear charts).
- Clamp policy (Wave-2 "clamp bad values" decision): non-finite values → 0
  in `normalizeSeries`; negatives treated as 0 for radius math but keep
  raw values in point data — exactly like PR #43's donut sweep handling.

## Marks

All existing mark types; no new ones needed.

- Grid (decorative, no labels, no ticks): spokes as `line` marks +
  concentric rings as `polyline`s at low opacity. Toggle via
  `grid?: boolean` (default: on — decision pending).
- Per series: closed `polyline` (first vertex repeated) for the stroke +
  `path` for the fill at low opacity (default fill on at ~0.2 — decision
  pending; stacked translucent polygons are the radar idiom).
- Optional vertex dots, same options as `lines()` (`dot: 'none' | 'all'`,
  default `'none'`).

## Interactions

One `ScenePoint` per vertex
`{id, label, value, index, x, y, seriesIndex, seriesLabel}` — hover/click
work through the existing `PointHitTargets`; nothing is rendered as text.

## Edge cases

- Empty input → empty shell with a11y desc (`"radar chart, no data"`).
- All-zero max → grid + points at center (no division by zero).
- 2 axes → degenerate line (closed polyline still valid).
- Series shorter than axis count → missing axes treated as 0
  (deterministic, simple).
- 1 axis → single dot, following `lines()`' `singlePointDot` convention.

## Implementation scope

- `packages/core/src/charts/radar.ts` + unit tests
  (angles/radii, multi-series overlay, clamp behavior, grid toggle,
  degenerate cases: empty, all-zero, short series).
- `packages/core/src/index.ts` export.
- React `RadarChart` wrapper following the existing chart-wrapper pattern.
- `docs/API.md` entry, changeset (minor), demo addition, size-budget check.

## Decisions pending

1. Single-series shorthand `radar([1, 2, 3])`? Recommendation: yes, lone
   radar polygons are the common case.
2. Grid on by default? Recommendation: yes, radar without reference
   geometry is unreadable.
3. Fill default on at ~0.2 opacity vs stroke-only? Recommendation: fill on.
