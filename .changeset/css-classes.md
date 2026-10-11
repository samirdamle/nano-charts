---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

CSS classes for styling charts: new `class` option in `BaseOptions` assigns developer CSS class(es) to the generated `<svg>` element (merged with the built-in `nc-chart` class and any `toSVG`/`className` render opt), and every mark now carries generated semantic classes — a kind class plus an indexed class (`nc-point nc-point-3`, `nc-bar nc-bar-2`, `nc-segment`, `nc-block`, `nc-line`, `nc-area`, `nc-cell`, `nc-connector`, `nc-track`, `nc-gridline`, `nc-axis`, `nc-tick`, `nc-label`, …). Multi-series marks also get `nc-series-{i}` (mirroring `data-series`), axis parts get `nc-axis-x`/`nc-axis-y`, and pictogram blocks get their fill state (`nc-filled`/`nc-empty`/`nc-partial`). Indexes mirror the existing `data-index` attributes. Fully backward compatible.
