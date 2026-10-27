---
'@samirdamle/nano-charts': minor
---

pictogram: fix connector rendering and add per-segment styling. Connectors are now drawn as one line per gap between adjacent blocks (center to center) instead of a single spanning line, so dashed/dotted styles render as uniform connectors instead of broken fragments behind the blocks. The `connector` option also accepts an explicit `segments` array for custom spans with per-segment styling: `connector: { segments: [{ span: [0, 2], color: 'red' }, { span: [2, 4], color: 'blue', style: 'dashed' }] }` — `span` holds the block indices at the segment's two ends (clamped, direction-free), and omitted segment fields fall back to the connector-level `color`/`thickness`/`style`
