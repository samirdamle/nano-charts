# ADR 0001: Fix double stroke+fill on marks; keep rects for solid shapes, use stroked arcs for the donut ring

- Status: Accepted
- Date: 2026-09-05

## Context

Bar, Win-Loss, Bullet, and Heatmap all rendered filled `<rect>` marks, and Donut
rendered filled ring-segment `<path>` marks (an outer arc + inner arc + closing
line, forming a closed donut-slice polygon). In the demo, Win-Loss bars showed
a visible extra border around every bar (see the reported screenshot: light
purple/blue bars with a lighter outline).

Root cause: `toSVG()` and the React `<ChartSvg>` both set
`fill="currentColor" stroke="currentColor"` on the root `<svg>` element, so
that stroke-based marks (`polyline`, existing `line` marks) don't need to
repeat `stroke="currentColor"` on every element. `stroke` is an inherited SVG
presentation property, so any descendant that doesn't explicitly set its own
`stroke` picks up `currentColor` from the root. The `rect` case in both
renderers never emitted a `stroke` attribute at all, so every rect silently
inherited `stroke="currentColor"` plus the browser-default `stroke-width: 1`,
producing a fill **and** an unwanted 1-unit border on every bar/cell. Donut's
path marks had the same latent bug (they only ever set `fill`), it just wasn't
the shape shown in the report.

The request was to eliminate double stroke+fill everywhere, and it proposed a
specific fix: replace `rect` marks with `line` marks (using `stroke` +
`stroke-width` to draw a bar as a thick stroked line) for Bar, Win-Loss, and
Bullet; use a stroked `path` arc (instead of a filled ring) for Donut; and
asked for a recommendation on Heatmap specifically (rects vs. stroke-based
lines), plus an assessment of the actual byte-size and rendering-cost impact
when many chart instances are on one page.

## Decision

1. **Rect marks stay rects.** Fix the bug at the renderer level: both
   `to-svg.ts` and React's `Marks.tsx` now always emit `stroke="none"` on
   `<rect>`, unconditionally. Rects in this codebase are fill-only by design
   (the `Mark` type's `rect` variant has no stroke fields), so hardcoding
   `stroke="none"` there is a renderer invariant, not a per-chart concern.
   This fixes Bar, Win-Loss, Bullet's range/value bars, and Heatmap in one
   place, with no change to any chart's geometry.
2. **Donut switches to a stroked arc.** `ringSegmentPath` (outer arc + inner
   arc + closing line, 6 path commands, filled) is replaced by `arcPath`, a
   single arc traced at the ring's mid-radius (2 path commands), rendered with
   `fill: 'none'`, `stroke: color`, `strokeWidth: thickness`. This is a real
   improvement, not just a bug fix — see Measurements below.
3. **Heatmap stays on rects**, not lines. See the analysis below.
4. Bar/Win-Loss/Bullet were prototyped as `line`-based marks and then reverted
   back to `rect` after measuring actual output size (see below) — the
   `line` approach was larger, not smaller.

## Measurements

All numbers are generated markup only (`toSVG()` output), not the library's
own shipped JS bundle (that's a separate, much smaller number — see
"Package size" below).

### Bar / Win-Loss / Bullet: rect vs. line

A filled rect already carries its "thickness" for free — `width`/`height` are
geometry that would be needed regardless. A stroked line only gets two
endpoints from its geometry (`x1,y1,x2,y2`); the perpendicular thickness has
to be supplied by a *separate* `stroke-width` attribute, so the line
representation needs strictly **one more attribute** than the rect
representation for the same visual bar, on top of `stroke-width` /
`stroke-opacity` being longer attribute names than `width` / `fill-opacity`.

| bars | rect: raw / gzip | line: raw / gzip |
|---|---|---|
| 10 | 948 B / 169 B | 996 B / 170 B |
| 100 | 9,578 B / 455 B | 10,156 B / 693 B |
| 500 | 48,278 B / 1,735 B | 51,556 B / 3,189 B |

Lines lose on both raw size and gzip at every scale tested, and the gzip gap
widens with more bars (rect markup repeats `fill="currentColor"` verbatim,
which compresses very well; line markup has more distinct per-element
attributes, which compresses less well).

**Conclusion: for Bar, Win-Loss, and Bullet, rects are the smaller and
simpler primitive.** Converting them to stroked lines was the wrong direction
for the stated goal (more minimal SVG).

### Donut: filled ring-path vs. stroked arc-path

Here the geometry itself shrinks, not just the attribute list: the old
`ringSegmentPath` needs an outer half-arc, a second outer half-arc, a line to
the inner radius, and two inner half-arcs to close the shape (6 path commands:
`M A A L A A Z`). The new `arcPath` only needs two half-arcs along the single
mid-radius (`M A A`), because `stroke-width` now supplies the ring's
thickness instead of a second (inner) arc.

| segments | old (filled ring): raw / gzip | new (stroked arc): raw / gzip |
|---|---|---|
| 10 | 1,415 B / 147 B | 1,275 B / 140 B |
| 100 | 14,150 B / 220 B | 12,750 B / 194 B |
| 500 | 70,750 B / 500 B | 63,750 B / 395 B |

**Conclusion: the stroked-arc redesign is a genuine ~10% size win for Donut**
(both raw and gzip), even after accounting for the extra `fill="none"` /
`stroke` / `stroke-width` attributes it needs — because the `d` path data
itself gets much shorter.

### Heatmap: rect vs. line — why rect wins architecturally

Two structural reasons rule out lines for heatmap cells, independent of byte
count:

1. **No thickness-sharing opportunity.** Bar/Bullet bars are one solid color
   per bar, so a stroked line can represent a whole bar with one mark.
   Heatmap cells are each independently colored by a continuous color scale —
   adjacent cells essentially never share a fill color — so there's no
   merging win, and per-cell a line still needs the same attribute count as a
   rect (this repo's serialization: `x1,y1,x2,y2,stroke,stroke-width` vs.
   `x,y,width,height,fill`, both 5 attributes when opacity isn't in play), so
   the swap is a wash on size and a net loss for the reason below.
2. **`rx` rounded corners aren't expressible with a stroked line.** Heatmap
   supports a `radius` option that rounds cell corners via `rect`'s `rx`.
   A `round` stroke linecap only rounds the *ends* of a line segment, which
   for a square cell drawn as a zero-length or short line degenerates into a
   circle/pill, not a rounded square. There's no way to get partial corner
   rounding from a stroked line.

**Conclusion: Heatmap keeps `rect` marks.** It already benefits from the same
renderer-level `stroke="none"` fix as Bar/Win-Loss/Bullet, with no geometry
changes needed.

### Rendering cost (hundreds of chart instances on one page)

Independent of markup size, filling a rect is cheaper for a browser to
rasterize than stroking a line or arc: a stroke requires the rasterizer to
compute an offset outline (tessellating two parallel paths plus joins/caps),
which is strictly more work than a plain fill. So for a page with hundreds of
small nano-charts, rects are, if anything, *cheaper* to paint than the
equivalent stroked lines — there is no rendering-efficiency argument for
switching Bar/Win-Loss/Bullet/Heatmap to lines. Donut's per-segment cost is a
wash (it was already a filled path before, and stroking one arc vs. filling
a closed ring-shaped path are both O(1) per segment); the win there is purely
in markup/`d`-string size, from having half as many arc commands per segment.

### Package size (library's own shipped code, not generated markup)

Measured via the existing `pnpm size` budget in `packages/core`
(esbuild + brotli, includes the whole exported chart function plus its
dependencies):

- Before this change: full barrel `4.05 kB` brotli (limit `6 kB`)
- After this change: full barrel `3.97 kB` brotli (limit `6 kB`)

The library's shipped bundle got very slightly *smaller*, driven by Donut's
simplification (`ringSegmentPath` → `arcPath` removes the inner-radius
arithmetic and the `L`/second-arc-pair bookkeeping); Bar/Win-Loss/Bullet are
unchanged from before this ADR (reverted to their original rect-based code).
This bundle-size number is unrelated to the per-chart-instance markup-size
numbers above — it reflects the JS that computes marks, not the SVG a given
chart instance emits.

## Consequences

- `rect` marks are now a hard renderer invariant: always `stroke="none"`,
  in both `packages/core/src/render/to-svg.ts` and
  `packages/react/src/render/Marks.tsx`. Any future chart that pushes a
  `rect` mark gets this for free and must not rely on rects ever showing a
  stroke; if a bordered rect is ever wanted, that needs a new explicit
  mechanism (e.g. a `stroke`/`strokeWidth` field added to the `rect` variant
  of `Mark`), not reliance on inheritance.
- The `Mark` type's `path` variant gained a `strokeOpacity` field (mirroring
  the existing `fillOpacity`), used by Donut's gauge-track and alternating
  odd/even segment opacity. `line` and `polyline` were left as they were —
  the prototyped `strokeOpacity`/`strokeLinecap` additions to `line` were
  removed again along with the Bar/Win-Loss/Bullet revert, since nothing
  uses them.
- `donut.ts`'s `ringSegmentPath` helper (outer+inner arc, closed fill shape)
  is gone, replaced by `arcPath` (single mid-radius arc, stroked). The
  "split into two half-sweeps so a 360° ring doesn't collapse" technique is
  preserved, just applied to one arc instead of two.
- Test coverage was added at the renderer level
  (`packages/core/tests/render/to-svg.test.ts`,
  `packages/react/tests/Marks.test.tsx`) asserting rects always render
  `stroke="none"` and paths propagate `stroke-opacity`, plus updated
  `donut.test.ts` assertions for the new 2-arc (was 4-arc) path shape.
- No public API surface changed: `BarOptions.radius`, `HeatmapOptions.radius`,
  `DonutOptions.thickness`, etc. all behave the same as before.

## Alternatives considered

- **Fix rects by adding `stroke: 'none'` as data on each chart's rect marks**
  (mirroring the in-progress, separate fix already applied to `area.ts`'s
  fill path) instead of hardcoding it in the renderer. Rejected: `rect`
  marks in this codebase never have a legitimate stroke, so encoding the
  invariant once in the renderer is less repetition than adding the same
  field to every rect-pushing call site across five chart files, and it
  can't be forgotten in a future chart.
- **Convert Bar/Win-Loss/Bullet to stroked lines**, per the original
  request. Prototyped fully (types, both renderers, all five chart/test
  files), measured, and reverted — see Measurements above. Larger raw and
  gzip output, no rendering-cost benefit, and loses partial corner-radius
  support without a corresponding win.
- **Convert Heatmap to stroked lines.** Rejected before implementation: no
  thickness-sharing benefit (cells are independently colored) and no way to
  express `rx` rounded corners with a line's stroke caps.
