---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

Add automatic plot padding to `line()`, `area()`, `lines()`, `bar()`, `scatter()`, and `heatmap()`: when `padding` is omitted, each chart now measures its marks (half stroke width / dot radius at the data extrema) and its axes (line thickness, tick length, label boxes — measured from the exact marks the axis draws) and reserves just enough space on each side so nothing clips. Without axes the plot nearly fills the supplied width and height. Passing an explicit `padding` number or per-side object overrides any side; omitted sides stay automatic.
