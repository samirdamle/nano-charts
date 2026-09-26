---
'@samirdamle/nano-charts': minor
---

Add `mode: 'spline'` to `line()` for smooth Catmull-Rom curves through the points (`mode: 'linear'` remains the default). Also adds `strokeDasharray` support to the `path` mark so dashed curves render in both SVG and React output.
