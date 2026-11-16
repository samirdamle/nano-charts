---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': minor
---

Plots: every chart can return its geometry in data form alongside the SVG (#216). Pass `plots: true` and the scene carries a typed `plots` payload — points, lengths, and computed geometry in pixels at full precision, each element with its datum identity and resolved color, plus a self-contained `frame`. Opt-in and non-breaking: the key is absent when the option is off, and scenes with it off are byte-identical to before. React gains an `onPlots` callback prop on all wrappers, typed per chart (fired after mount when plots were computed; never for null data).
