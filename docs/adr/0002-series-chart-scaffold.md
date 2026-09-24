# ADR 0002: Collapse the series-chart scaffold with a tiered extraction, not one shared interface

- Status: Accepted
- Date: 2026-09-05

## Context

Issue #19 (top recommendation of an architecture review of `packages/core`)
observed that `line.ts`, `area.ts`, `lines.ts`, `bar.ts`, and `win-loss.ts`
each hand-derive the same sequence: resolve `width`/`height`/`color`/`padding`
defaults, normalize input via `normalizeSeries`, build the a11y summary via
`seriesSummary`, early-return an empty `Scene` when there's no data, lay out
the padded box via `seriesLayout`, map datums to `ScenePoint`s, and (in
`line`/`area`/`lines`) fall back to a single dot when there's only one point —
that last fallback's comment is copy-pasted verbatim in all three. It proposed
a single "series chart" scaffold — chart kind, resolved options, and a
per-point mark-building callback — used by all five files.

Reading the five files closely shows they don't all share the same shape.
`line` and `area` are identical through every step above and diverge only in
how a laid-out point becomes a `Mark` — a clean fit for one scaffold. `bar`
and `win-loss` position marks with equal-width **slots**
(`slot = (right - left) / count`, `x = left + i*slot + (slot-barWidth)/2`),
not the index-based `layout.x(index)` that `line`/`area` use; `bar` also has a
different domain (extent of *stacked column totals*, anchored at zero) and a
different "count" (columns, not datums), and never falls back to a dot for a
single column since a lone bar already renders fine. `win-loss` doesn't scale
by value at all — it only needs the padded box's `top`/`bottom`/`center`, and
today hand-derives `left`/`right`/`top`/`bottom` itself instead of calling
`seriesLayout`, a second, slightly-drifted copy of that box math. `lines`
takes an array of series rather than one series, so it can't share the
single-series call signature at all.

Forcing `bar`, `win-loss`, and `lines` through one callback-based interface
shaped for "one point → one mark" would mean adding override hooks for
domain, count, and normalization until the interface is doing as much
branching as the duplication it replaces — fighting each chart's real shape
for a dedup win that isn't actually there for those three.

## Decision

Extract three tiers instead of one shared interface, in
`packages/core/src/core/series-chart.ts` (new) and `packages/core/src/core/plot.ts`:

1. **`renderSeriesChart`** (new, `series-chart.ts`) — the full scaffold
   (resolve defaults, normalize, a11y summary, empty-scene guard,
   `seriesLayout`, map datums to `ScenePoint`s) for the two charts that are
   genuinely identical through setup: `line` and `area`. Each chart supplies
   only a `(points, layout, color) => Mark[]` callback for its one point of
   real variation.
2. **`singlePointDot`** (new, `series-chart.ts`) — the single-point-to-dot
   fallback mark, used directly by `line`, `area`, and `lines`. `lines` keeps
   its own multi-series *point-layout* loop (it doesn't fit `renderSeriesChart`'s
   single-series signature) but no longer repeats the fallback's logic or its
   copy-pasted comment a third time.
3. **`resolveChartShell` / `resolveA11y` / `sceneShell`** (new,
   `series-chart.ts`) — these three are shape-agnostic (they only know about
   `width`/`height`/`color`/`padding` and the `{title, desc}` a11y pair, never
   about single- vs. multi-series data), so `bar` and `win-loss` use them
   directly instead of through `renderSeriesChart`'s callback, and `lines`
   uses `resolveChartShell`/`sceneShell` too even though its a11y desc and
   point-layout stay bespoke — closing what would otherwise be a fifth
   hand-rolled copy of the empty-scene shell.
4. **`paddedBox` / `slotLayout`** (new, `plot.ts`) — `bar` and `win-loss`
   position marks with equal-width slots, not `seriesLayout`'s index-based
   `x(index)`, so they call `paddedBox` (the `left`/`right`/`top`/`bottom`
   inset that `seriesLayout` itself now builds on) plus `slotLayout` directly.
   `win-loss` no longer hand-derives its box, closing the drift the issue
   flagged, and does so without instantiating a `seriesLayout` value-scale it
   would never call — `paddedBox` gives it exactly the box math it needs and
   nothing else (the layout-unification half beyond this is still tracked
   separately in #20).

`bar`'s stacked-segment mark-building and `win-loss`'s win/loss-region mark
building stay bespoke; only their shared setup and slot math move into the new
helpers.

## Consequences

- Five chart files still each own the logic that actually varies per chart —
  `line`/`area`'s mark-building callback, `lines`'s multi-series loop,
  `bar`'s stacked-segment rects, `win-loss`'s win/loss-region rects — but no
  longer re-derive defaults resolution, normalization wiring, the a11y
  summary, the empty-scene shape, or (for `bar`/`win-loss`) box/slot math.
- `win-loss.ts` no longer hand-derives its padded box; it calls the new
  `paddedBox` helper like `bar` does, closing the drift the issue flagged,
  without carrying an unused value-scale the way passing a placeholder
  domain through `seriesLayout` would have.
- No public API or `Scene`/`Mark` shape changes. All five existing chart test
  files (`line`, `area`, `lines`, `bar`, `win-loss`) are expected to pass
  unmodified — they assert through the `Scene` interface, not internals.
- `plot.ts` stays scoped to pure layout math (`resolvePadding`, `paddedBox`,
  `seriesLayout`, `slotLayout`); the new orchestration helpers that compose
  normalize + a11y + layout live in `series-chart.ts` instead, so `plot.ts`
  doesn't grow a dependency on `normalize.ts`/`a11y.ts`.

## Alternatives considered

- **One `renderSeriesChart`-style scaffold for all five charts**, per the
  issue's literal proposal. Rejected: `bar`'s column/stacked-segment shape and
  domain, and `win-loss`'s non-value-scaled box, would need enough override
  hooks (custom domain, custom count, custom normalize, opt out of the
  single-point fallback) that the "one interface" would carry nearly as much
  conditional complexity as the duplication it replaces, while adding real
  risk to `bar`'s negative-value stacking math and `win-loss`'s zero-tick
  rendering — both pinned by exact numeric assertions in their test files.
- **Minimal scope: `line`/`area` only, leave `bar`/`win-loss` untouched.**
  Rejected: it would leave `win-loss`'s drifted hand-rolled box math in place,
  which the issue specifically flags as a second copy of `seriesLayout`'s
  logic, and leaves `bar`/`win-loss`'s identical slot-math formula duplicated
  between them for no reason — a small, safe, shape-respecting win was
  available for both.
