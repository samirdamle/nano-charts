---
'@samirdamle/nano-charts': minor
---

Add a `track` option to `donut()`: an opt-in background ring behind the segments (the "100%" reference, e.g. the classic progress-ring look). Segmented mode gains it as `track: true` or `track: { color, opacity }` (default: base color at 15% opacity, same radii/thickness as the segments). Gauge mode already drew a background ring — the option now customizes its color/opacity, and `track: false` hides it; default gauge rendering is unchanged. Tracks are decorative and emit no points.
