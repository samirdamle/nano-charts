# ADR 0002: Donut per-segment color via an algorithmic categorical HSL palette

- Status: Accepted
- Date: 2026-09-05

## Context

`donut()` already accepts multi-segment array input (`number[]`, `{value, label?, id?}[]`, or generic `T[]` with accessors) and renders one arc per segment. Every segment shared a single `color`, distinguished only by an alternating stroke-opacity stripe (`i % 2 === 0 ? 1 : 0.55`). The ask was for real per-segment color — "an array of values + colors, or an array of objects" — which required deciding how colors get supplied, what the default looks like when none is given, and where the mechanism lives in the type system.

## Decision

1. **Per-segment color input**, one mechanism per existing `DonutInput` shape:
   - `number[]` data → new `options.colors?: string[]`, index-matched.
   - `ObjectPoint[]` data → new optional `color?: string` field on the object.
   - Generic `T[]` data → new optional `color` accessor alongside the existing `value`/`label`/`id` accessors.

   The object-field and accessor mechanisms live in the **shared** `SeriesAccessors<T>`/`Datum` types in `normalize.ts`, not as donut-local types — `bar`'s stacked segments go through the identical `ObjectPoint`/`normalizeSeries` pipeline and will want the same mechanism (tracked in #24), so adding it once centrally avoids doing this twice.

2. **Default color, when none is given, is an algorithmically generated categorical palette**, not a fixed/curated list. `core/palette.ts` exports `categoricalColor(index, total)` → `hsl(h, 60%, l)`: hue `= index * (360 / total)` (always maximally spread for whatever `total` is, starting at 0°), lightness alternating 30%/70% by index parity for extra adjacent-segment contrast on top of hue alone. Saturation is fixed at 60%.

3. **The palette is positional, not identity-stable.** A segment's color is a pure function of its `(index, total)` position in a given render, not of its `id`/`label`. Segment colors can shift between renders if the segment count changes.

4. **The opacity stripe is suppressed once a segment has a real color** (explicit or palette-generated); it survives only on the legacy path where the caller sets one uniform `options.color` for every segment, since that path has no color-based differentiation of its own.

5. **`core/palette.ts` is internal** — not re-exported from the package's public entrypoint. `donut` is the only current consumer; `bar` and `lines` reuse is tracked separately (#24, #25), not built speculatively now.

## Considered options

- **Curated fixed palette** (e.g. a hardcoded 8–10 hex-value list, d3-`schemeCategory10`-style) instead of algorithmic generation. Rejected: breaks down past the list length (colors repeat), where hue-division scales to any segment count by construction.
- **Identity-stable coloring** (hash `id`/`label` to a hue, so a category keeps its color across renders regardless of segment count). Rejected for now: needs a hash function and a decision about what to hash when `id` defaults to a bare index; this is a "tiny chart, redrawn per data snapshot" library (per the README), not a live dashboard widget where cross-render color continuity is the primary concern. Left as a future option.
- **Keep `SeriesAccessors<T>`/`Datum` untouched**, give `donut` its own local color-accessor type instead of touching shared core types. Initially preferred (mirrors the earlier "don't widen `ScenePoint` for a donut-only need" call on the same feature), reversed once it became clear `bar`'s stacked segments need the identical mechanism through the identical shared pipeline (#24) — adding it once centrally is cheaper than adding it twice, and the unused field `bar`/`line`/`area` inherit in the meantime is harmless.
- **Export `categoricalColor` publicly now**, anticipating `bar`/`lines` reuse. Rejected: no public consumer exists yet; export it when #24/#25 actually land.

## Consequences

- `Datum` (`normalize.ts`) gains an optional `color?: string` field, inherited by every chart built on `SeriesAccessors<T>` (`bar`, `line`, `area`, `lines`, `donut`) even though only `donut` reads it today.
- `DonutOptions<T>` gains `colors?: string[]`; `ObjectPoint` gains `color?: string`.
- `donut()`'s gauge branch (single value/max, not multi-segment) is untouched — none of this applies there.
- Follow-up wiring for `bar` and `lines` tracked in #24 and #25.
