---
'@samirdamle/nano-charts-react': major
---

Rename all React components from `…Chart` to `…NanoChart` (`LineChart` → `LineNanoChart`, `AreaChart` → `AreaNanoChart`, etc., including the `…ChartProps` interfaces) so they don't collide with chart components from other libraries (e.g. Recharts). Core function names (`line()`, `bar()`, …) are unchanged.
