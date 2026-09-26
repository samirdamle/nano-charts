---
'@samirdamle/nano-charts': patch
---

Fix hover/click lookups on heatmap cells: `rect` marks now support the optional `index` field (the mark's dense position in the points array, matching the circle-mark contract), serialized as `data-index` by both `toSVG` and the React renderer. Heatmap cells are tagged, so `scene.points[Number(rect.dataset.index)]` resolves to the hovered cell.
