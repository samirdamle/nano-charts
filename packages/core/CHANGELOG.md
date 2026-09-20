# @samirdamle/nano-charts

## 0.1.0

Initial release: 9 tiny SVG charts — `line`, `area`, `lines` (multi-series overlay), `bar` (with stacking and horizontal orientation), `winLoss`, `bullet`, `donut` (gauge and segments), `scatter`, `heatmap` — built on a renderer-agnostic `data → Scene` model with a `toSVG` serializer.

- Zero runtime dependencies; tree-shakeable per-chart subpath imports.
- Shared `BaseOptions` (`width`, `height`, colors, padding, accessibility labels) across all charts.
- Categorical palette fallbacks for multi-series `lines()` and segmented `donut()`/`bar()`.
- Dual ESM + CJS builds with per-condition TypeScript types.
