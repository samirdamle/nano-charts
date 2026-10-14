---
'@samirdamle/nano-charts': patch
---

internal refactor (no behavior change): adopt the shared `resolveSegmentColor`, `sceneShell`/`resolveChartShell`, `lineMarkExtent`, and dial center-label helpers across the charts; drop the local `posThickness` and radar's `polar` in favor of the shared names; remove conditional spreads for optional fields (except pictogram block `stroke`, where tests pin property absence).
