---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': minor
---

Add `radar()` and the `RadarChart` React component: a multi-axis spider chart for comparing profiles across shared axes. Accepts a single series (`radar([4, 9, 2])`) or an array of series to overlay (`{ data, name?, color?, strokeWidth?, strokeDasharray?, strokeLinecap?, fill?, dot?, dotRadius? }`, plus `value`/`label`/`id` accessors). Angles start at the top and sweep clockwise on a shared `[0, max]` radial scale (defaults to the data max; values above an explicit `max` clamp to the rim). A decorative spider grid (spokes + quarter rings) and polygon fill are on by default; no labels or legend are rendered — values surface through hover/click points, one per axis per series, carrying `seriesIndex`/`seriesLabel`. Color precedence matches `lines()`: per-series `color` → uniform `options.color` → categorical palette.
