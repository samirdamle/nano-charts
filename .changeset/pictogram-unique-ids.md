---
"@samirdamle/nano-charts": patch
"@samirdamle/nano-charts-react": patch
---

Fix pictogram charts sharing `<defs>`/clip ids when several are inlined in one document. `<use href="#…">` resolves document-wide, so every pictogram defaulted to `id="pictogram-block"` and later charts rendered the first chart's shape (dots showed as squares, emoji as tiny boxes, partials not as partials). The default `idPrefix` is now unique per chart (`pictogram-1`, `pictogram-2`, …); pass an explicit `idPrefix` to take control of the ids.
