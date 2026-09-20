---
'@samirdamle/nano-charts': patch
---

`lines()` now falls back to the categorical palette (`categoricalColor(seriesIndex, series.length)`) when a series omits its own `color`, so multi-series charts are visually distinguishable out of the box. An explicit `options.color` still applies uniformly to every series, and a per-series `color` still wins — the same precedence `donut()` uses.
