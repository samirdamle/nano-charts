---
'@samirdamle/nano-charts': patch
---

`bar()` now colors stacked segments with the same categorical-palette mechanism as `donut()`: an explicit per-segment color (object field or `colorAccessor`) wins, falling back to `categoricalColor(row, segs.length)` per stack, retiring the old fillOpacity step-down as the default. Passing a uniform `options.color` still applies the opacity step-down for backward compatibility. Non-stacked columns are unaffected.
