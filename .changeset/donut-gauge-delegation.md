---
'@samirdamle/nano-charts': patch
---

Refactor: `donut()` with gauge input (`{ value, max }`) now delegates to `gauge()` in arc mode instead of maintaining a parallel inline implementation (closes #22). Rendering, points, and a11y are unchanged for valid inputs; non-finite values now follow gauge's clamp policy (pinned at the dial bottom) instead of leaking `NaN` into labels.
