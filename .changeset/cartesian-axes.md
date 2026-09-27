---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

Add optional cartesian axes to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()` via new `xAxis` / `yAxis` options (off by default, so existing charts render unchanged). Each axis supports an axis line (or ticks-only with `line: false`), configurable line/tick color and thickness, automatic nice-number ticks (`ticks: true`) or explicit tick values, optional tick labels (`labels: true` or a formatter function), per-axis gridlines with configurable color, thickness, and `solid` / `dashed` / `dotted` style, and `position` to draw the axis at a specific data value (e.g. an x-axis at `y = 20` instead of `y = 0`). React chart components pick up the new props automatically.
