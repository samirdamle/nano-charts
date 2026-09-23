---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': minor
---

Add a `gap` option to `donut()`: space between adjacent segments in segmented mode, in user units (same units as `thickness`). Each segment is inset by half the gap on both ends, so the wrap seam at `startAngle` is gapped too. Defaults to `0.2`; `0` renders touching segments as before. Negative gaps behave as `0`, non-finite gaps fall back to the default, and a segment narrower than the full gap collapses to a zero-length arc instead of inverting. Ignored in gauge mode (a single value arc has nothing to gap against).
