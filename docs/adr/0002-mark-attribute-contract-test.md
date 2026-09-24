# ADR 0002: Contract test to prevent Mark-attribute drift between to-svg.ts and Marks.tsx

- Status: Accepted
- Date: 2026-09-05

## Context

`toSVG()` (`packages/core/src/render/to-svg.ts`) and React's `<Marks>`
(`packages/react/src/render/Marks.tsx`) are two independent adapters at the
`Mark[] → visual` seam: one serializes to an SVG string, the other renders a
React/JSX tree. That split is real and worth keeping — see ADR 0001, whose
`rect` `stroke="none"` fix and Donut arc redesign both had to be applied to
each renderer's own hand-written attribute list.

Neither renderer derives its attribute list from the `Mark` union in
`types.ts`; each hand-lists which fields it reads per mark type
(`renderMark`'s `attr(...)` calls vs. the JSX props). Nothing enforces the two
lists stay in sync, and in practice they had already drifted before this ADR:

- `Marks.tsx`'s `polyline` case never read `strokeDasharray` or
  `strokeLinecap`, even though `to-svg.ts` renders both and
  `to-svg.test.ts` asserts them. A scene built by `line()`/`lines()` with
  `strokeDasharray`/`strokeLinecap` set (both charts support these options)
  and rendered through `<ChartSvg>` would silently lose the dash pattern and
  cap style that `toSVG()` renders correctly.
- `Marks.tsx`'s `circle` case never read `index` or `seriesIndex`, so the
  `data-index`/`data-series` attributes `to-svg.ts` emits (and
  `to-svg.test.ts` asserts) were absent from the React output.
- `Marks.tsx`'s `polyline` case defaulted `fill` to `'none'`
  (`mark.fill ?? 'none'`) when the field was undefined, while `to-svg.ts`
  omits the `fill` attribute entirely in that case, letting it inherit
  `fill="currentColor"` from the root `<svg>`. No current call site omits
  `fill` on a polyline mark, so this hadn't produced a visible bug, but it is
  the same class of undeclared, renderer-specific behavior.

## Decision

Add one shared contract test
(`packages/react/tests/mark-attrs.contract.test.tsx`, since the React package
already depends on core and can import both `toSVG` and `Marks`) that, for
every `Mark` variant:

1. Builds a "full" sample mark with every optional field set to a
   distinguishing value, renders it through both `toSVG()` (parsed back with
   `DOMParser`) and `<Marks>` (rendered with `@testing-library/react`), and
   asserts the two elements expose the same set of DOM attribute names.
2. Builds a "minimal" sample mark with every optional field left `undefined`,
   and asserts the same attribute-name-set equality — this is what catches
   default-value drift like the `fill ?? 'none'` case above, not just
   missing-field drift.

This does not touch the runtime code path in either renderer — both stay
hand-written switch statements, each free to shape its output for its own
target (string vs. JSX). The single shared list of "what a mark variant's
full field set looks like" lives in the test, so adding a field to `Mark` and
forgetting to wire it into one of the two renderers now fails a test instead
of silently shipping a rendering difference.

The three drifts found above are fixed in the same change (`Marks.tsx` now
reads `strokeDasharray`/`strokeLinecap` on `polyline` and
`index`/`seriesIndex` on `circle`, and drops the `fill ?? 'none'` default so
undefined `fill` behaves identically to `to-svg.ts`), since the whole point of
adding the contract test is to close the drift it's meant to catch, not just
document it.

## Alternatives considered

- **Shared per-mark-type attribute table**, with both renderers iterating a
  common `[propName, svgAttrName]` list instead of hand-listing props.
  Rejected for now: this structurally prevents drift rather than just
  detecting it, but it forces both renderers into a generic-loop shape that
  fights the special cases each already has to encode (`rect`'s
  unconditional `stroke="none"` regardless of any field, `circle`'s
  `index`/`seriesIndex` → `data-index`/`data-series` renaming). A test that
  asserts the two lists match is cheaper and keeps both adapters simple,
  hand-written switch statements — consistent with ADR 0001's "keep both
  adapters" framing. If a third adapter (e.g. a canvas renderer) is ever
  added, this decision should be revisited, since a table's leverage grows
  with the number of consumers.

## Consequences

- Adding a field to any `Mark` variant now requires a matching entry in the
  contract test's "full" fixture for that variant, or the test only exercises
  the field that already existed — the test doesn't statically enforce
  fixture completeness against the `Mark` type, so this is a discipline the
  test's own comment calls out, not a compiler-enforced guarantee.
- `packages/react/tests/mark-attrs.contract.test.tsx` becomes the place a
  future renderer-parity bug (like the three above) shows up first, instead
  of being discovered as a visual bug report.
