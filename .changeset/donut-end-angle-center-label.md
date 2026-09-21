---
'@samirdamle/nano-charts': minor
---

Add `endAngle` and `centerLabel` options to `donut()`. `endAngle` (default `startAngle + 360`) lets the dial span a partial arc, e.g. `135` → `405` for a classic gauge sweep, in both gauge and segmented modes. `centerLabel` renders text at the dial's center: a literal string, or a formatter receiving `{ value, min, max, frac }` (`{ value, min: 0, max, frac }` in gauge mode, `{ value: total, min: 0, max: total, frac: 1 }` in segmented mode).
