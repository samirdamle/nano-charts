# nano-charts-react + monorepo restructure — Design Spec

**Date:** 2026-09-01
**Packages:** `@samirdamle/nano-charts` (existing, relocated), `@samirdamle/nano-charts-react` (new)
**Status:** Approved design, pre-implementation

## 1. Purpose

The original design (`2026-09-01-nano-charts-design.md`, §1) planned a **separate repo**
for the React wrapper. This spec supersedes that decision: the wrapper turns out to be
small (each chart function already returns a renderer-agnostic `Scene`; the React
components are thin `Scene → JSX` mappers, on the order of ~100–150 lines total), and
the core is still under active, frequent change (a new chart shipped every commit so
far). A two-repo split would force a coordinated two-step release every time a chart or
the `Mark` union changes. A single-repo pnpm **monorepo** with two independently
published packages keeps core and React changes atomic in one PR/CI run while still
shipping React as an optional, separately-versioned package that vanilla consumers never
pull in.

Framework bindings beyond React (Vue, Svelte, Solid) are planned, which is what rules
out folding React into the core package as a subpath export — the monorepo needs to
scale to `packages/vue`, `packages/svelte`, etc. later without restructuring again.

## 2. Goals & non-goals

**Goals**
- Restructure the existing single-package repo into a pnpm monorepo without losing git
  history on any moved file.
- Add `@samirdamle/nano-charts-react`: one component per chart, matching core's
  per-chart function names and tree-shaking model.
- Keep core (`@samirdamle/nano-charts`) and React versioned and published
  independently via Changesets, so a React-only release doesn't force a core bump.
- React components accept the same `data`/`options` shape as their core function
  counterparts — no separate API to learn.
- Built-in hover/click interactivity via callback props (`onPointHover`,
  `onPointClick`), no built-in tooltip UI — matches core's "no visual opinions" stance.
- Next.js App Router / RSC compatible (`'use client'` on every component).
- Carry forward in-progress release-prep work (Changesets, CI/release workflows,
  LICENSE, README) rather than clobber it.

**Non-goals (this pass)**
- No Vue/Svelte/Solid packages yet — this spec only sets up the monorepo shape that
  makes adding them later a `packages/<framework>` addition, not a restructure.
- No built-in tooltip component (consumers build their own UI from the callback data).
- No demo/playground site.

## 3. Repository layout

```
nano-charts/                        (repo root, private workspace root)
  package.json                      # private: true; root scripts fan out via pnpm -r
  pnpm-workspace.yaml                # packages: ['packages/*']
  tsconfig.base.json                  # shared compiler options
  .changeset/                         # shared; versions packages independently
  .github/workflows/{ci,release}.yml  # updated to build/test/publish across packages
  LICENSE
  README.md                           # top-level overview, links to each package's README
  docs/                                # unchanged location; specs/plans apply project-wide
  packages/
    core/
      package.json                    # name: @samirdamle/nano-charts (unchanged)
      src/  tests/  tsup.config.ts  vitest.config.ts  .size-limit.json  tsconfig.json
    react/
      package.json                    # name: @samirdamle/nano-charts-react (new)
      src/  tests/  tsup.config.ts  vitest.config.ts  .size-limit.json  tsconfig.json
```

## 4. Core package migration mechanics

- `git mv src tests tsup.config.ts vitest.config.ts .size-limit.json packages/core/` —
  preserves history (`git log --follow` still works per file).
- `packages/core/package.json`: same `name`, version, `exports` map, and scripts as
  today; only relative paths (e.g. the `tsconfig.base.json` reference) move up one
  level.
- Root `package.json`: becomes `"private": true`; drop `main`/`module`/`types`/
  `exports`/`files`/`dependencies` (root publishes nothing); keep devDependencies used
  by both packages hoisted at root (TypeScript, ESLint, Prettier, Vitest, tsup,
  `@changesets/cli`); package-specific devDependencies (e.g.
  `@testing-library/react`) live in `packages/react`.
- `tsconfig.json` → `tsconfig.base.json` at root; each package gets a thin
  `tsconfig.json` extending it (`packages/react`'s additionally sets
  `"jsx": "react-jsx"`).
- `.github/workflows/ci.yml`: `pnpm -r build && pnpm -r test && pnpm -r lint` instead
  of root-only, so a core change that breaks React's parity tests fails CI immediately.
- `.github/workflows/release.yml` and `.changeset/config.json`: Changesets already
  supports independent per-package versioning against a `packages/*` glob — confirm
  config resolves correctly after the move, no structural change expected.
- This spec document itself supersedes §1 and the "Future" note (§13) of
  `2026-09-01-nano-charts-design.md` regarding a separate React repo; that file is left
  otherwise intact as the historical record of the core's design.

## 5. `nano-charts-react` package: architecture & API

Same compute → Scene → render split as core, with React as the renderer:

```
packages/react/src/
  index.ts                 # barrel: re-exports all components + shared types
  charts/
    LineChart.tsx  AreaChart.tsx  BarChart.tsx  WinLossChart.tsx
    BulletChart.tsx  DonutChart.tsx  ScatterChart.tsx  HeatmapChart.tsx
  render/
    Marks.tsx               # shared: Mark[] -> <path>/<circle>/<rect>/<line>/<polyline>
  hooks/
    useHoveredPoint.ts       # shared hover-state logic, keyed by nearest ScenePoint
```

Each component:
- Takes the same `data`/`options` as its core function counterpart, e.g.
  `LineChart(props: LineOptions & InteractionProps)` calls `line(data, options)`
  internally to get a `Scene`.
- Renders `scene.marks` via the shared `Marks` renderer; each rendered mark is wired
  to its source `ScenePoint` for hit-testing.
- Interaction props (shared across all charts):
  ```ts
  interface InteractionProps {
    onPointHover?: (point: ScenePoint | null) => void; // null on leave
    onPointClick?: (point: ScenePoint) => void;
    className?: string;
    style?: React.CSSProperties;
  }
  ```
  No built-in tooltip UI ships; consumers build their own from the callback data.
- Root element is an `<svg>` with the same `role="img"`/`<title>`/`<desc>` a11y wiring
  as `toSVG`, so accessible output matches the vanilla renderer exactly, plus the added
  event handlers.
- Every component file starts with `'use client'` for Next.js App Router compatibility.

Exports mirror core's tree-shaking model: the barrel
(`@samirdamle/nano-charts-react`) plus per-chart subpaths
(`@samirdamle/nano-charts-react/line`, `/area`, …).

## 6. Build, test, and tooling for `packages/react`

- **Build:** `tsup`, dual ESM+CJS+`.d.ts`, one entry per component + barrel.
  `react`/`react-dom` are `peerDependencies` (`>=16.8`) and `devDependencies` only —
  never bundled. `tsup.config.ts` sets `external: ['react', 'react-dom']`.
- **JSX:** `packages/react/tsconfig.json` sets `"jsx": "react-jsx"`.
- **Test:** Vitest with `jsdom` environment + `@testing-library/react`. Per-chart
  tests assert rendered SVG structure and fire hover/click events to check
  `onPointHover`/`onPointClick` receive the correct `ScenePoint`. A parity test asserts
  each component's rendered marks match `toSVG(coreFn(data, options))` for the same
  input (minus event handlers), so the React wrapper can't silently drift from core's
  layout logic.
- **Size budget:** own `.size-limit.json`, budgets ~1.5–2KB per component (excludes
  externalized `react`/`react-dom`).
- **Lint:** existing ESLint config plus `eslint-plugin-react-hooks`.

## 7. Versioning & release

- Independent versioning via Changesets — `packages/core` and `packages/react` each
  release on their own schedule; a changeset can touch one or both.
- `packages/react` starts at `0.0.0`, matching core's pre-1.0 convention.
- `packages/react/package.json` declares `"@samirdamle/nano-charts": "workspace:*"`
  as a regular `dependency` (it's the runtime engine the components call into, not a
  peer) — pnpm resolves it locally in dev; Changesets rewrites it to the real
  published semver range on release.
- `publishConfig.access: "public"` on `packages/react/package.json`, matching core.

## 8. Future (out of scope for this pass)

- `packages/vue`, `packages/svelte`, `packages/solid` following the same
  `Scene`-consuming pattern established here.
- Built-in tooltip component (opt-in, separate from the core interaction callbacks).
- Interactive playground/docs site covering both packages.
