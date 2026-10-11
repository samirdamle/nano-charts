---
'@samirdamle/nano-charts': patch
---

pictogram: dotted connectors now default to round linecaps so dots render as dots (a 0.1-unit dash with butt caps was a barely-visible sliver). Solid/dashed connectors keep the butt default; an explicit `linecap` still overrides in all cases.
