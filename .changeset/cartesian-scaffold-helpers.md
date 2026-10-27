---
'@samirdamle/nano-charts': patch
---

cartesian charts: internal refactor — the per-chart axis-layout orientation ternary is now a shared `axisLayout()` helper and the mark layering order a shared `layerMarks()` helper in `core/axis.ts`. No behavior change.
