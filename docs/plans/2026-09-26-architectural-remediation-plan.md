# Architectural Review & Remediation Plan

**Date:** 2026-09-26
**Scope:** `@samirdamle/nano-charts` (`packages/core`) and `@samirdamle/nano-charts-react` (`packages/react`)

---

## Context & Review Summary (Updated Post-Axes Commits)

Following the merge of `feat/axes` (`87551bc` on `develop`, `0cfd831` on `main`), the library now supports optional Cartesian axes (`xAxis`, `yAxis`) across `line`, `area`, `lines`, `bar`, `scatter`, and `heatmap`, and `main` now includes all recent chart features (`line` spline mode, `bar` grouped/waterfall modes, `scatter` per-point color, `donut` gauge delegation, and `heatmap` `data-index`).

This plan addresses the remaining architectural, performance, size, durability, and test-coverage findings from both the initial review and the new Cartesian axes review, organized into six sequential tasks.

---

## Open Design Questions

> [!IMPORTANT]
> Before executing this plan, please confirm your preferences on these four design decisions:
>
> 1. **Default Cross-Axis Position on Category Axes (`bar` Y-axis & `heatmap` X/Y axes):**
>    Currently, [`axisMarks`](../../packages/core/src/core/axis.ts#L170-L171) defaults `position` to `0` and maps it through `crossScale(0)`. Because [`bar.ts`](../../packages/core/src/charts/bar.ts#L333) sets `crossScale` to `catScale = (i) => slot.x(i) + barW / 2` and [`heatmap.ts`](../../packages/core/src/charts/heatmap.ts#L84-L85) sets `crossScale` to `rowCenter` / `colCenter`, enabling `yAxis: { show: true }` on a vertical `bar` draws the Y-axis line **through the center of the first bar** (rather than at `layout.left`), and enabling `xAxis: { show: true }` on a `heatmap` draws the X-axis line **through the middle of the top row of cells** (rather than at `box.bottom` or `box.top`).
>    - **Recommendation:** Default category cross-positioning to the plot edge (`layout.left` for vertical `bar` `yAxis`, `layout.bottom` for `heatmap` `xAxis`, `layout.left` for `heatmap` `yAxis`) when `options.position === undefined`, while still honoring an explicit numeric `options.position` via `crossScale(position)`.
>
> 2. **`ScenePoint` Coordinate Convention (`x, y` as top-left vs. center) & `<PointHitTargets>`:**
>    [`bar`](../../packages/core/src/charts/bar.ts#L293-L304), [`winLoss`](../../packages/core/src/charts/win-loss.ts#L62), and [`heatmap`](../../packages/core/src/charts/heatmap.ts#L79) set `point.x, point.y` to the **top-left corner** of each rect (`w, h` carry the size), whereas [`pictogram`](../../packages/core/src/charts/pictogram.ts#L204-L205) sets `point.x, point.y` to the **center** of each block. Meanwhile, [`PointHitTargets.tsx`](../../packages/react/src/render/PointHitTargets.tsx#L20-L25) always renders `<circle cx={point.x} cy={point.y} r={hitRadius} />`, placing a tiny 4px hit circle at the top-left corner of bars and heatmap cells.
>    - **Recommendation:** Keep `ScenePoint` coordinates backward-compatible (`x, y, w, h` unchanged), tag `bar` and `winLoss` `<rect>` marks with `index`, and update [`PointHitTargets.tsx`](../../packages/react/src/render/PointHitTargets.tsx) to render a `<rect>` covering the full `[x, y, w, h]` box when `w !== undefined && h !== undefined` (adjusting for `pictogram`'s center-anchored `x, y`).
>
> 3. **`RadarChart` Prop Name (`series` vs. `data`):**
>    All 10 other React components take `data={...}`, while [`RadarChart`](../../packages/react/src/charts/RadarChart.tsx#L9) takes `series={...}`.
>    - **Recommendation:** Support `data` on `RadarChartProps` and keep `series` as a deprecated/supported alias (`const input = props.data ?? props.series`) so existing callers and the demo don't break.
>
> 4. **Zero-Domain Baseline for `bar([0, 0])` and `bullet({ value: 0, target: 0 })`:**
>    Because [`linearScale`](../../packages/core/src/core/geometry.ts#L27-L30) maps a collapsed domain `[0, 0]` to the midpoint `(r0 + r1) / 2`, `bullet({ value: 0, target: 0 })` currently draws a 50%-wide value bar, and `bar([0, 0])` places zero-height bars at the vertical middle of the canvas.
>    - **Recommendation:** Anchor collapsed `[0, 0]` domains in `bullet` and `bar` to the zero baseline (`left` / `bottom`) while keeping midpoint behavior for `line`, `area`, `lines`, and `scatter`.

---

## Task 1: Repository & Release Hygiene (`develop` / `main` Alignment + Conflict Guard)

**Goal:** Remove committed iCloud sync-conflict files, sync `develop` with the `main` release state, and prevent sync-conflict artifacts anywhere in the repo.

**Files:**
- Delete: `packages/core/vitest.config 2.ts`
- Delete: `packages/react/CHANGELOG 2.md`
- Delete (untracked directories/files if present): `tests/charts 2/`, `tests/core 2/`, `tests/render 2/`, `.github/workflows 2/`, `packages/react/dist/* 3.js`
- Modify: [`scripts/verify-dist.mjs`](../../scripts/verify-dist.mjs)
- Modify: [`.github/workflows/release.yml`](../../.github/workflows/release.yml)

**Steps:**
- [ ] **Step 1.1:** Remove committed conflict copies (`git rm "packages/core/vitest.config 2.ts" "packages/react/CHANGELOG 2.md"`) and clean untracked `* 2` / `* 3` directories/files.
- [ ] **Step 1.2:** Reconcile `develop` and `main` (and `changeset-release/main`) so `package.json` versions, `CHANGELOG.md` entries, `.changeset/*.md` files, and `.github/workflows/release.yml` (OIDC trusted publishing without dead `NPM_TOKEN` env vars) are in sync.
- [ ] **Step 1.3:** Extend [`scripts/verify-dist.mjs`](../../scripts/verify-dist.mjs) (or add a workspace check in `lint`) to scan `packages/*/src`, `packages/*/tests`, and `.github/` for space-numbered conflict filenames (`/\s+\d+(\.|$)/`) so duplicate test or config files fail CI/prepublish immediately.

---

## Task 2: Packaging, Subpath Exports & Contract Enforcement

**Goal:** Ensure all 12 core charts and all 11 React chart components have complete subpath exports, TypeScript declarations, `use client` banners, and compiler-enforced renderer parity tests.

**Files:**
- Modify: [`packages/core/tsup.config.ts`](../../packages/core/tsup.config.ts)
- Modify: [`packages/core/package.json`](../../packages/core/package.json)
- Modify: [`packages/react/tsup.config.ts`](../../packages/react/tsup.config.ts)
- Modify: [`packages/react/package.json`](../../packages/react/package.json)
- Modify: [`packages/react/scripts/check-use-client.mjs`](../../packages/react/scripts/check-use-client.mjs)
- Modify: [`packages/core/tests/index.test.ts`](../../packages/core/tests/index.test.ts)
- Modify: [`packages/core/tests/render/inherited-stroke.test.ts`](../../packages/core/tests/render/inherited-stroke.test.ts)
- Modify: [`packages/react/tests/index.test.tsx`](../../packages/react/tests/index.test.tsx)
- Modify: [`packages/react/tests/mark-attrs.contract.test.tsx`](../../packages/react/tests/mark-attrs.contract.test.tsx)

**Steps:**
- [ ] **Step 2.1:** Add `radar` and `pictogram` entries to [`packages/core/tsup.config.ts`](../../packages/core/tsup.config.ts) and `exports` in [`packages/core/package.json`](../../packages/core/package.json); add `gauge`, `radar`, and `pictogram` to `typesVersions` in `packages/core/package.json`.
- [ ] **Step 2.2:** Add `radar` (`src/charts/RadarChart.tsx`) and `pictogram` (`src/charts/PictogramChart.tsx`) entries to [`packages/react/tsup.config.ts`](../../packages/react/tsup.config.ts) and `exports` in [`packages/react/package.json`](../../packages/react/package.json); add `gauge`, `radar`, and `pictogram` to `typesVersions` in `packages/react/package.json` and `FALLBACK_ENTRY_NAMES` in [`check-use-client.mjs`](../../packages/react/scripts/check-use-client.mjs).
- [ ] **Step 2.3:** Update `packages/react/src/charts/*.tsx` to import each chart from its `@samirdamle/nano-charts/<chart>` subpath rather than the root barrel, ensuring CJS and non-tree-shaking dev bundlers only load the single chart module.
- [ ] **Step 2.4:** In [`mark-attrs.contract.test.tsx`](../../packages/react/tests/mark-attrs.contract.test.tsx), type every "full" fixture as `Required<Extract<Mark, { type: '...' }>>` and add the missing fields (`index: 3` on `rect`, `strokeDasharray: '4 2'` and `strokeLinecap: 'round'` on `line`).
- [ ] **Step 2.5:** Expand [`packages/core/tests/index.test.ts`](../../packages/core/tests/index.test.ts), [`packages/react/tests/index.test.tsx`](../../packages/react/tests/index.test.tsx), and [`inherited-stroke.test.ts`](../../packages/core/tests/render/inherited-stroke.test.ts) to cover all 12 core charts / 11 React components, plus a subpath-export contract assertion verifying `package.json#exports`, `typesVersions`, and `tsup.config.ts` match `src/index.ts`.

---

## Task 3: Pure Determinism & SSR Hydration Safety in `pictogram`

**Goal:** Eliminate the mutable module-global `pictogramUid` counter so `pictogram()` is a pure deterministic function (`toSVG(pictogram(x)) === toSVG(pictogram(x))`) and `<PictogramChart>` never causes React SSR hydration mismatches.

**Files:**
- Modify: [`packages/core/src/charts/pictogram.ts`](../../packages/core/src/charts/pictogram.ts)
- Modify: [`packages/react/src/charts/PictogramChart.tsx`](../../packages/react/src/charts/PictogramChart.tsx)
- Modify: [`packages/core/tests/charts/pictogram.test.ts`](../../packages/core/tests/charts/pictogram.test.ts)
- Modify: [`packages/react/tests/PictogramChart.test.tsx`](../../packages/react/tests/PictogramChart.test.tsx)

**Steps:**
- [ ] **Step 3.1:** In [`pictogram.ts`](../../packages/core/src/charts/pictogram.ts#L54-L77), replace `let pictogramUid = 0` with a deterministic short hash of the block shape & clip configuration (`shape`, `s`, `radius`, `emoji`, and for partial blocks `horizontal`, `fraction`), e.g. `pictogram-<hash>`. Identical block definitions produce identical `<defs>` geometry, so document-wide `<use href="#...">` references remain collision-free across charts with different block styles while keeping `pictogram()` 100% pure and deterministic.
- [ ] **Step 3.2:** In [`PictogramChart.tsx`](../../packages/react/src/charts/PictogramChart.tsx), use `React.useId()` as the default `idPrefix` when `props.idPrefix` is not provided (`const reactId = useId(); ... idPrefix: props.idPrefix ?? \`pictogram-\${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}\``).
- [ ] **Step 3.3:** Add unit tests asserting `toSVG(pictogram([3, 4.5])) === toSVG(pictogram([3, 4.5]))` and distinct IDs when block shapes/sizes differ.

---

## Task 4: Cartesian Axes Fixes & Consolidation (`core/axis.ts`)

**Goal:** Fix precision, tick deduplication, single-point/category axis positioning, and consolidate the 5 duplicated `AxisLayout` blocks to shrink bundle size.

**Files:**
- Modify: [`packages/core/src/core/axis.ts`](../../packages/core/src/core/axis.ts)
- Modify: [`packages/core/src/core/series-chart.ts`](../../packages/core/src/core/series-chart.ts)
- Modify: [`packages/core/src/charts/lines.ts`](../../packages/core/src/charts/lines.ts)
- Modify: [`packages/core/src/charts/bar.ts`](../../packages/core/src/charts/bar.ts)
- Modify: [`packages/core/src/charts/scatter.ts`](../../packages/core/src/charts/scatter.ts)
- Modify: [`packages/core/src/charts/heatmap.ts`](../../packages/core/src/charts/heatmap.ts)
- Modify: [`packages/core/tests/core/axis.test.ts`](../../packages/core/tests/core/axis.test.ts)

**Steps:**
- [ ] **Step 4.1:** Fix sub-0.01 domain tick precision in [`niceTicks`](../../packages/core/src/core/axis.ts#L74-L88): compute `const prec = Math.max(2, decimalsFor(step));` and call `round(v, prec)` instead of `round(v)` (which truncates to 2 decimal places and produces duplicate `0` ticks on domains like `[0, 0.005]`).
- [ ] **Step 4.2:** Deduplicate explicit `options.ticks` in [`axisMarks`](../../packages/core/src/core/axis.ts#L131-L151) even when `integerTicks` is `false`.
- [ ] **Step 4.3:** Extract a `withCartesianAxes(marks, box, xSpec, ySpec, xAxis, yAxis)` helper in [`axis.ts`](../../packages/core/src/core/axis.ts) that:
  - Fast-returns `marks` immediately when `!xAxis?.show && !yAxis?.show` (zero allocations on the default sparkline path).
  - Derives transposed `crossDomain`, `crossScale`, `span`, and `crossSpan` automatically for `x` and `y`, replacing the ~95 lines of duplicated `xA`/`yA` boilerplate across `series-chart.ts`, `lines.ts`, `bar.ts`, `scatter.ts`, and `heatmap.ts`.
  - Supports an optional `defaultCrossPos` on each axis spec so category cross-axes (`bar` `yAxis`, `heatmap` `xAxis`/`yAxis`, and 1-point `line`/`lines`) default their axis line to the plot boundary (`layout.left` / `layout.bottom`) instead of the center of the first bar/cell when `options.position` is omitted.
- [ ] **Step 4.4:** Add unit tests in [`axis.test.ts`](../../packages/core/tests/core/axis.test.ts) for sub-0.01 domains (`[0, 0.005]`), duplicate explicit ticks, `bar` Y-axis default edge positioning, and `heatmap` X/Y-axis default edge positioning.

---

## Task 5: Core Efficiency, Code Reuse & Edge-Case Durability

**Goal:** Eliminate redundant hot-path array traversals, consolidate dial/shell helpers, unify `data-index` tagging, and close `NaN`/zero-domain clamping gaps.

**Files:**
- Modify: [`packages/core/src/core/series-chart.ts`](../../packages/core/src/core/series-chart.ts)
- Modify: [`packages/core/src/core/a11y.ts`](../../packages/core/src/core/a11y.ts)
- Modify: [`packages/core/src/core/normalize.ts`](../../packages/core/src/core/normalize.ts)
- Modify: [`packages/core/src/core/geometry.ts`](../../packages/core/src/core/geometry.ts)
- Modify: [`packages/core/src/render/to-svg.ts`](../../packages/core/src/render/to-svg.ts)
- Modify: [`packages/core/src/charts/area.ts`](../../packages/core/src/charts/area.ts)
- Modify: [`packages/core/src/charts/bar.ts`](../../packages/core/src/charts/bar.ts)
- Modify: [`packages/core/src/charts/win-loss.ts`](../../packages/core/src/charts/win-loss.ts)
- Modify: [`packages/core/src/charts/bullet.ts`](../../packages/core/src/charts/bullet.ts)
- Modify: [`packages/core/src/charts/donut.ts`](../../packages/core/src/charts/donut.ts)
- Modify: [`packages/core/src/charts/gauge.ts`](../../packages/core/src/charts/gauge.ts)
- Modify: [`packages/core/src/charts/scatter.ts`](../../packages/core/src/charts/scatter.ts)
- Modify: [`packages/core/src/charts/heatmap.ts`](../../packages/core/src/charts/heatmap.ts)
- Modify: [`packages/core/src/charts/radar.ts`](../../packages/core/src/charts/radar.ts)
- Modify: [`packages/core/src/charts/pictogram.ts`](../../packages/core/src/charts/pictogram.ts)

**Steps:**
- [ ] **Step 5.1:** **Single-pass `extent` & lazy `a11y`:**
  - In [`resolveA11y`](../../packages/core/src/core/series-chart.ts#L28-L35), skip calling `seriesSummary` when both `options.title` and `options.desc` are provided, and accept an optional precomputed `[min, max]` extent.
  - In [`renderSeriesChart`](../../packages/core/src/core/series-chart.ts#L78-L98) and [`lines.ts`](../../packages/core/src/charts/lines.ts#L47-L107), compute `valueDomain` once instead of 3× (`renderSeriesChart`) or 2× (`lines`).
- [ ] **Step 5.2:** **Fast-path numeric serialization in [`toSVG`](../../packages/core/src/render/to-svg.ts#L5-L18):**
  - In `attr(name, value)`, if `typeof value === 'number'`, return `` ` ${name}="${value}"` `` directly without running 5 regex `.replace()` calls; in `esc(s)`, add an early return `if (!/[&<>"']/.test(s)) return s;`.
- [ ] **Step 5.3:** **Code reuse across charts:**
  - Use [`resolveChartShell`](../../packages/core/src/core/series-chart.ts#L18-L25) and [`sceneShell`](../../packages/core/src/core/series-chart.ts#L38-L50) in `bullet.ts`, `scatter.ts`, `heatmap.ts`, and `pictogram.ts`.
  - Respect `options.padding` in `donut.ts` and `gauge.ts`, and share the center-label / track mark helper between them.
  - Reuse `polar()` from `core/geometry.ts` in `radar.ts`.
  - Make `RadarOptions<T = number>` extend `Partial<SeriesAccessors<T>>` in [`radar.ts`](../../packages/core/src/charts/radar.ts#L36) so `RadarChartProps<T>` in React exposes `value`, `label`, and `id` accessors.
  - Support per-element number/object branching in [`normalizeSeries`](../../packages/core/src/core/normalize.ts#L56-L75) so `pictogram.ts` can call `normalizeSeries(data, accessors)` directly without its 17-line `normalizeDatum` wrapper.
- [ ] **Step 5.4:** **Consistent `data-index` on marks:**
  - Add `{ index: 0 }` to `singlePointDot` in [`area.ts`](../../packages/core/src/charts/area.ts#L18).
  - Add `index: p.index` to `<circle>` marks in [`scatter.ts`](../../packages/core/src/charts/scatter.ts#L109).
  - Add `index: points.length` to segment `<rect>` marks in [`bar.ts`](../../packages/core/src/charts/bar.ts#L283) and [`win-loss.ts`](../../packages/core/src/charts/win-loss.ts#L61).
- [ ] **Step 5.5:** **Input durability & clamping:**
  - Sanitize coordinates/values with [`toFiniteNumber`](../../packages/core/src/core/normalize.ts#L36-L38) in `scatter.ts`, `heatmap.ts`, and `bullet.ts`.
  - Replace `Math.max(...array)` spreads on data arrays in `lines.ts`, `bar.ts`, `bullet.ts`, `heatmap.ts`, `radar.ts`, and `pictogram.ts` with loop-based max or `extent()`.
  - Cap per-column block count in `pictogram.ts` (e.g., `MAX_BLOCKS = 1000`) to prevent accidental million-node DOM hangs when `unit` is omitted on large numbers.
  - Anchor collapsed `[0, 0]` domains in `bullet` and `bar` to the zero baseline (`left` / `bottom`).

---

## Task 6: React Performance, Hit-Testing Geometry & Boilerplate Reduction (`packages/react`)

**Goal:** Fix rect hit-testing in `<PointHitTargets>`, memoize React chart rendering for 500-chart tables, and eliminate wrapper boilerplate.

**Files:**
- Modify: [`packages/react/src/render/PointHitTargets.tsx`](../../packages/react/src/render/PointHitTargets.tsx)
- Modify: [`packages/react/src/render/ChartSvg.tsx`](../../packages/react/src/render/ChartSvg.tsx)
- Modify: `packages/react/src/charts/*.tsx`
- Modify: [`packages/react/tests/PointHitTargets.test.tsx`](../../packages/react/tests/PointHitTargets.test.tsx)
- Modify: [`packages/react/tests/RadarChart.test.tsx`](../../packages/react/tests/RadarChart.test.tsx)

**Steps:**
- [ ] **Step 6.1:** Fix [`PointHitTargets.tsx`](../../packages/react/src/render/PointHitTargets.tsx) so points with `w !== undefined && h !== undefined` render a transparent `<rect>` covering the bar/cell/block instead of a 4px `<circle>` at the top-left corner (`(point.x, point.y)`).
- [ ] **Step 6.2:** Wrap [`Marks`](../../packages/react/src/render/Marks.tsx) and the chart components in `React.memo` (or memoize scene generation in a shared `createChartComponent` helper in `ChartSvg.tsx`) so parent hover-state updates in a 500-chart table don't recompute scenes for unchanged charts.
- [ ] **Step 6.3:** Update [`RadarChart.tsx`](../../packages/react/src/charts/RadarChart.tsx) to accept `data` (with `series` kept as a backward-compatible alias) and forward `SeriesAccessors<T>`.

---

## Verification Plan

- `pnpm lint` — passes with zero warnings and zero sync-conflict files.
- `pnpm typecheck` — passes in both `packages/core` and `packages/react` (including `Required<Extract<Mark, ...>>` contract fixtures).
- `pnpm test` — all unit, integration, and contract tests pass across `core` and `react`.
- `pnpm build` — builds all ESM, CJS, and `.d.ts`/`.d.cts` subpaths (including `radar` and `pictogram`), passing `check-use-client.mjs` and `verify-dist.mjs`.
- `pnpm size` — all gzip bundle budgets pass (with standalone `line` and barrel sizes reduced by `withCartesianAxes` and React wrapper consolidation).
- `pnpm -r run publint` — zero packaging warnings on both `@samirdamle/nano-charts` and `@samirdamle/nano-charts-react`.
