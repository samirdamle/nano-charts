---
'@samirdamle/nano-charts': patch
'@samirdamle/nano-charts-react': minor
---

Fix the #190 validation friction batch (issue #211), all backward-compatible. React gains `LinesNanoChart` — core's multi-series `lines()` finally has a component, with a `./lines` subpath. `RadarNanoChart` now accepts `data` as an alias for its `series` prop (every other component uses `data`), and the shared React renderer renders an empty scene when a component's data prop is null/undefined instead of crashing inside a core chart function. Radar and pictogram get the subpath exports they were missing in **both** packages (`./radar`, `./pictogram` — the charts existed only in the barrels), and both packages now export `./package.json`. In core, `Annotation.x`/`y` are optional in the type: charts that ignore a coordinate (donut ignores `x`; bullet and win-loss ignore `y`) no longer force TypeScript consumers to pass dummy values, and an annotation missing a coordinate its chart needs is dropped as before. API.md now documents that `onAnnotationHover` fires `null` on pointer leave. The React barrel budget rises 15 → 15.5 kB for the new component (measured 15.49 kB); all bundle figures are refreshed.
