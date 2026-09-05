---
'@samirdamle/nano-charts': patch
---

Export the `SeriesInput<T>` type from the public API, so downstream packages (e.g. `@samirdamle/nano-charts-react`) can type a chart's `data` prop without redeclaring it.
