---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

Segmented `donut` now honours `seriesIndex` on annotations. Previously any `seriesIndex` annotation on a segmented donut was silently dropped (the dial mapper was wrapped with seriesCount 0). Now `seriesIndex` tags the annotation with that segment — its colour and identity — while the angle still comes purely from `y` on [0, total] (`x` is ignored), so one annotation is one (series, angle) pair. Gauge-mode donut is unchanged (it delegates to `gauge()`, which has no segments). An out-of-range `seriesIndex` still drops. The demo Bar "Annotations" cell now gives its dot and star a `seriesIndex` (0) so they sit on an individual sub-bar instead of the group-centre seam; grouped-bar core positioning itself was already correct and is unchanged.
