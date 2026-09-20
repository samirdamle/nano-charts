---
'@samirdamle/nano-charts': patch
---

`toSVG()` now renders circle marks with `stroke="none"` when the mark sets no stroke of its own, closing the last inherited-stroke gap from #9: scatter points with a custom color previously inherited `stroke="currentColor"` from the root `<svg>` and picked up an unwanted outline in the page's text color. An explicit circle stroke still wins. Adds render-level regression tests proving no mark in any chart type can inherit the root stroke.
