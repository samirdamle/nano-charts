---
'@samirdamle/nano-charts': minor
---

Add `mode: 'waterfall'` to `bar()`: each column renders as a cumulative step starting where the previous one ended, so `[3, 2, -1]` draws 0→3, 3→5, 5→4. New options: `upColor` / `downColor` color steps by delta sign (defaulting to the chart color; an explicit per-datum color still wins), `total` appends a final column spanning 0 to the grand total (with `totalColor`), and `connectors` (default `true`) draws thin dashed lines between consecutive columns. Works vertically and horizontally; `<BarChart mode="waterfall">` in React picks it up automatically.
