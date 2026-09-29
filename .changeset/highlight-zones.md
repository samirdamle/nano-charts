---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

Add `highlights` to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()`: an array of zones drawn as background regions behind the chart data, e.g. `highlights: [{ x: [2, 5], color: 'rgba(240, 221, 130, 0.25)' }]`. Zones use the chart's data coordinates (index-based `x` on line/area/lines/bar, data values on scatter, cell indices on heatmap); omitting `x` spans the full plot width and omitting `y` the full height. Zones are clipped to the plot, purely decorative (no hover points), and never affect automatic padding.
