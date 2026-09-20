---
'@samirdamle/nano-charts': patch
'@samirdamle/nano-charts-react': patch
---

Rendered SVGs no longer include a `<title>` child element: browsers display it as a hover tooltip (e.g. "radar chart"), which spoils the experience on tiny charts. The accessible name now comes from an `aria-label` attribute on the root `<svg>` (still `role="img"`); the `<desc>` data summary is kept, as it never produces a tooltip. The `title`/`desc` options still override the generated accessible name and description as before.
