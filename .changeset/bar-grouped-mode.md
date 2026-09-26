---
'@samirdamle/nano-charts': minor
---

Add `mode: 'grouped'` to `bar()`: multi-segment columns render side by side as one bar per segment instead of stacking. The value domain spans individual segment values, each bar starts at the zero baseline, and series are colored from the categorical palette. Works vertically and horizontally; `<BarChart mode="grouped">` in React picks it up automatically.
