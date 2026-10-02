---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': patch
---

Add `connector` to `pictogram()` (and `PictogramChart`): an optional `{ color?, thickness?, style? }` object that draws one line per series joining its rendered blocks, from the center of the first block to the center of the last, rendered behind the blocks. Defaults to a solid 2px line in the series' block color; `style` accepts `'solid' | 'dashed' | 'dotted'`. Series with fewer than two blocks get no connector.
