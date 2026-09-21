---
'@samirdamle/nano-charts': patch
'@samirdamle/nano-charts-react': patch
---

Fix partial pictogram blocks rendering as uniformly dim: the clipped overlay put `clip-path` directly on `<use>`, which browsers do not render. Partial blocks now reference a pre-clipped block variant defined in `<defs>` (the clip lives on a `<g>` wrapping the shape), so fractional fills display correctly for rect, circle, and emoji blocks in both `toSVG` and React output.
