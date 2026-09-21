---
'@samirdamle/nano-charts': minor
'@samirdamle/nano-charts-react': minor
---

Add a `gauge()` chart (and `GaugeChart` React component). `gauge({ value, max }, options)` supports a `min` domain and two modes over a configurable dial (default the classic 270° sweep, `135°` → `405°`): `'arc'` sweeps a foreground arc to the value, `'needle'` points a `line` or `triangle` needle at the value over the dial. Colored `zones` (`{ to, color }` bands) form the dial background in arc mode or the dial itself in needle mode; `centerLabel` (string or formatter receiving `{ value, min, max, frac }`) renders a readout at the center (just below center in needle mode, clear of the hub).
