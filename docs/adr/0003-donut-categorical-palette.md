# ADR 0003: Donut per-segment color via an algorithmic categorical HSL palette

- Status: Accepted
- Date: 2026-09-05

## Context

`donut()` already accepts multi-segment array input (`number[]`, `{value, label?, id?}[]`, or generic `T[]` with accessors) and renders one arc per segment. Every segment shared a single `color`, distinguished only by an alternating stroke-opacity stripe (`i % 2 === 0 ? 1 : 0.55`). The ask was for real per-segment color — "an array of values + colors, or an array of objects" — which required deciding how colors get supplied, what the default looks like when none is given, and where the mechanism lives in the type system.

## Decision

1. **Per-segment color input**, one mechanism per existing `DonutInput` shape:
   - `number[]` data → new `options.colors?: string[]`, index-matched.
   - `ObjectPoint[]` data → new optional `color?: string` field on the object.
   - Generic `T[]` data → new optional `colorAccessor` accessor alongside the existing `value`/`label`/`id` accessors.

   `normalizeSeries()` (shared by `bar`/`line`/`area`/`lines`/`donut`) resolves the color once, centrally — so when `bar` wires this up later (#24), it reuses the same resolution logic rather than re-deriving it. The object-field mechanism (`color?: string` on `ObjectPoint`) is added directly to the shared `ObjectPoint`/`SeriesInput<T>`, same as `value`/`label`/`id`. The accessor mechanism is *not* added to the shared `SeriesAccessors<T>` — it lives in a new, separate `SeriesColorAccessor<T>` interface (`colorAccessor?: ColorAccessor<T>`) that only `DonutOptions<T>` extends today. (See "Corrected during implementation" below for why these two mechanisms ended up treated differently.)

2. **Default color, when none is given, is an algorithmically generated categorical palette**, not a fixed/curated list. `core/palette.ts` exports `categoricalColor(index, total)` → `hsl(h, 60%, l)`: hue `= index * (360 / total)` (always maximally spread for whatever `total` is, starting at 0°), lightness alternating 30%/70% by index parity for extra adjacent-segment contrast on top of hue alone. Saturation is fixed at 60%.

3. **The palette is positional, not identity-stable.** A segment's color is a pure function of its `(index, total)` position in a given render, not of its `id`/`label`. Segment colors can shift between renders if the segment count changes.

4. **The opacity stripe is suppressed once a segment has a real color** (explicit or palette-generated); it survives only on the legacy path where the caller sets one uniform `options.color` for every segment, since that path has no color-based differentiation of its own.

5. **`core/palette.ts` is internal** — not re-exported from the package's public entrypoint. `donut` is the only current consumer; `bar` and `lines` reuse is tracked separately (#24, #25), not built speculatively now.

## Corrected during implementation

The first pass of this change added `colorAccessor` directly to the shared `SeriesAccessors<T>` interface and `color` directly to the shared `ObjectPoint`/`SeriesInput<T>` types in `normalize.ts`, reasoning (see "Considered options" below) that an unused optional field on `bar`/`line`/`area`/`win-loss`'s option types was harmless.

A Standards-axis code review caught that the accessor half of this was wrong: `bar`, `line`, `area`, and `win-loss` all extend `Partial<SeriesAccessors<T>>` for their options, a plain interface with no generic escape valve — so `bar(data, { colorAccessor: fn })` would silently **type-check and then do nothing**, a real footgun for a public API. Fixed by moving `colorAccessor` into its own `SeriesColorAccessor<T>` interface that only `DonutOptions<T>` extends today; `normalizeSeries()`'s internal resolution logic still serves all callers, so #24 can add the same extension to `BarOptions` when it lands, without ever having silently accepted the option beforehand.

The object-field half turned out *not* to have the same problem, on closer inspection: `SeriesInput<T> = number[] | ObjectPoint[] | T[]` already has a generic `T[]` branch, and TypeScript happily infers `T` from any object literal passed to it — so `line([{ value: 1, zzzNotARealField: 'nonsense' }])` type-checks today regardless of what `ObjectPoint` declares, proven with a throwaway `@ts-expect-error` probe during review. Splitting `color` into a donut-only `ObjectPointWithColor`/`SeriesInputWithColor<T>` (briefly done, then reverted) would have added a parallel type alias while preventing nothing that wasn't already open. So `color` stays directly on the shared `ObjectPoint`, exactly like `value`/`label`/`id` — only the accessor mechanism needed the split.

## Considered options

- **Curated fixed palette** (e.g. a hardcoded 8–10 hex-value list, d3-`schemeCategory10`-style) instead of algorithmic generation. Rejected: breaks down past the list length (colors repeat), where hue-division scales to any segment count by construction.
- **Identity-stable coloring** (hash `id`/`label` to a hue, so a category keeps its color across renders regardless of segment count). Rejected for now: needs a hash function and a decision about what to hash when `id` defaults to a bare index; this is a "tiny chart, redrawn per data snapshot" library (per the README), not a live dashboard widget where cross-render color continuity is the primary concern. Left as a future option.
- **Keep `SeriesAccessors<T>`/`SeriesInput<T>` untouched**, give `donut` its own fully-local color types instead of touching shared core types at all. Initially rejected in favor of widening the shared types directly (reasoning: `bar`'s stacked segments will want the identical mechanism per #24, so add it once centrally). Code review then showed the accessor half of that direct-widening let unrelated charts silently accept-and-ignore `colorAccessor` (a real defect, fixed by splitting it into donut-only `SeriesColorAccessor<T>`), but showed the object-field half wasn't actually unsafe to widen (see "Corrected during implementation"), so `color` stayed on the shared `ObjectPoint`. The final shape is a genuine middle ground, decided per-mechanism rather than applied uniformly: share what's provably safe to share, split off what isn't.
- **Export `categoricalColor` publicly now**, anticipating `bar`/`lines` reuse. Rejected: no public consumer exists yet; export it when #24/#25 actually land.

## Consequences

- `Datum` (`normalize.ts`) gains an optional `color?: string` field. `Datum` is `normalizeSeries()`'s output type, not something a caller constructs by hand, so this is harmless regardless of who else uses it.
- `ObjectPoint`/`SeriesInput<T>` gain `color?: string`, shared by every chart that uses them (`bar`, `line`, `area`, `win-loss`, `lines`, `donut`) — safe to share since `SeriesInput<T>`'s generic `T[]` branch already accepted arbitrary extra fields on any object-literal input regardless of `ObjectPoint`'s declared shape.
- New, donut-only `SeriesColorAccessor<T>` interface (`colorAccessor?: ColorAccessor<T>`); only `DonutOptions<T>` extends it (plus a new `colors?: string[]`) — `bar`/`line`/`area`/`win-loss`/`lines`'s existing option types are unchanged, since a plain interface has no generic escape valve to make widening `SeriesAccessors<T>` itself safe.
- `donut()`'s gauge branch (single value/max, not multi-segment) is untouched — none of this applies there.
- Follow-up wiring for `bar` and `lines` tracked in #24 and #25 — `bar` will add its own `Partial<SeriesColorAccessor<T>>` extension to `BarOptions` following donut's pattern when it lands; the object-field mechanism needs no equivalent extension since it's already shared.
