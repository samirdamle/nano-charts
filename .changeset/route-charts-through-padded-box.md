---
'@samirdamle/nano-charts': patch
---

Route `bullet`, `scatter`, and `heatmap` through `plot.ts`'s shared `paddedBox` seam instead of each hand-resolving padding into a box. `heatmap` gains real `padding` support in the process (defaulting to `0`, so existing callers see no change); a future padding-edge-case fix now propagates to every padded chart at once instead of needing to be repeated per file.
