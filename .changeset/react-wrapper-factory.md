---
'@samirdamle/nano-charts-react': patch
---

internal refactor (no behavior change): the 11 chart wrapper components now share a single `renderNanoChart` body — each wrapper only declares its props interface and splits its data prop (`data`, or `series` for radar). Public API, prop types, and generic inference are unchanged.
