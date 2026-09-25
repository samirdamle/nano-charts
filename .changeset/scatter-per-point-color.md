---
'@samirdamle/nano-charts': minor
---

Add per-point `color` to scatter: `ScatterPoint` gains an optional `color` field and `ScatterAccessors` gains a `colorAccessor`, so one chart can render multiple series (e.g. clusters) in different colors. Per-point color takes precedence over the uniform `color` option; colorless points behave exactly as before.
