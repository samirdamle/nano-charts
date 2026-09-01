# nano-charts — Design Spec

**Date:** 2026-09-01
**Package:** `@samirdamle/nano-charts`
**Status:** Approved design, pre-implementation

## 1. Purpose

An extremely lightweight, zero-dependency, TypeScript-first library for generating
tiny SVG charts — sparklines, micro bar charts, donuts/gauges, bullet charts, scatter
plots, and heatmaps — the kind that appear **numerously** in table columns, metric
cards, and dashboards. Because they repeat many times per page, per-chart cost
(bundle size and compute) must be minimal.

This repo is the **framework-agnostic core**. A separate repo
(`@samirdamle/nano-charts-react`) will wrap it in React components. The core is
designed so that wrapper cleanly, and so other framework wrappers (Vue/Svelte/Solid)
are possible without changes here.

## 2. Goals & non-goals

**Goals**
- Zero runtime dependencies.
- Aggressively tree-shakeable: each chart is a separate named function and subpath
  entry; importing one chart pulls in only that chart + shared geometry.
- Deterministic and SSR-safe: same input → byte-identical output, no DOM reads, no
  randomness, no text measurement.
- TypeScript-first with precise per-chart option types.
- Accessible by default (role/title/desc + optional text summary).
- Theme-friendly: `currentColor` default so charts inherit surrounding text color.

**Non-goals (v1)**
- No interactivity in the core (hover/click/tooltips belong in wrappers).
- No animation.
- No axes, legends, gridlines, or tick labels (these aren't "nano").
- No demo/playground site in this repo (follow-up).
- No bubble sizing, no explicit per-point x for series charts (index-spaced only).

## 3. Core architecture: compute → Scene → render

The central decision. Charts do **not** return SVG strings directly. Each chart
function is a pure `(data, options) => Scene`. A `Scene` is a renderer-agnostic layout
model: computed primitive marks plus mapped data points and a11y metadata.

```
data ──[chart fn]──▶ Scene ──┬── toSVG(scene) ─────▶ string   (SSR / vanilla)
                             └── (wrapper) marks ──▶ JSX/DOM  (React, etc.)
```

The valuable, hard-to-get-right part — mapping data into a fixed coordinate space —
lives once in the core and is unit-testable without a DOM. Renderers are dumb: they
walk `scene.marks` and emit elements.

### 3.1 Scene & Mark types

```ts
interface Scene {
  width: number;            // internal coordinate-space width
  height: number;           // internal coordinate-space height
  viewBox: string;          // `0 0 ${width} ${height}`
  marks: Mark[];            // draw order
  points: ScenePoint[];     // data-bound points for wrapper interactivity
  a11y: { title: string; desc: string };
}

type Mark =
  | { type: 'polyline'; points: [number, number][]; stroke?: string; strokeWidth?: number; fill?: 'none' }
  | { type: 'path';     d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { type: 'rect';     x: number; y: number; width: number; height: number; fill?: string; rx?: number }
  | { type: 'circle';   cx: number; cy: number; r: number; fill?: string; stroke?: string }
  | { type: 'line';     x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number };

interface ScenePoint {
  id: string | number;
  label: string;
  value: number;            // for scatter, see per-chart notes
  index: number;
  x: number;                // pixel/coordinate position
  y: number;
  // heatmap cells also carry: row, col, w, h
  [k: string]: unknown;
}
```

Colors on marks are optional; when omitted the renderer/CSS supplies them (default
`currentColor`). This keeps most marks attribute-light.

## 4. Data model & normalization

All series charts normalize three input forms into one canonical datum
`{ id, label, value, index }`:

1. **`number[]`** — `id`/`label` derived from index (`id = index`, `label = String(value)`).
2. **Accessor form** — `chart(rows, { value, label?, id? })` where each is
   `(row, index) => …`. `value` is required in this form; `label`/`id` optional.
3. **`{ id, label, value }[]`** — keys auto-detected and used directly. (This is just
   the accessor form where keys already match.)

Detection: if the first element is a `number` → form 1. If an options object with a
`value` accessor is supplied → form 2. Otherwise treat elements as objects and read
`id`/`label`/`value` keys → form 3.

**Per-chart shape variations** (asymmetry is intentional and accepted):
- **`bar`** additionally accepts nested arrays for stacking — each data point that is
  itself an array becomes a stacked column of segments; a scalar/object point is a
  single column. The accessor applies to segment objects.
- **`bullet`** takes a single object `{ value, target, ranges?, id?, label? }`.
- **`donut`** takes either `{ value, max }` (gauge) or `{ id, label, value }[]` (segments).
- **`scatter`** takes 2D points → canonical `{ id, label, x, y, index }`; forms:
  `[x, y][]`, `{ x, y }[]` / `{ id, label, x, y }[]`, or accessors `{ x, y, label?, id? }`.
- **`heatmap`** takes a 2D matrix (`number[][]` or object cells with a `value`
  accessor); a single-row matrix renders a heat strip.

## 5. Public API

Named function per chart (tree-shakeable), each also exposed at a subpath. Plus the
shared `toSVG` serializer and shared types.

```ts
import { line, area, bar, winLoss, bullet, donut, scatter, heatmap, toSVG } from '@samirdamle/nano-charts';
// or, maximally tree-shaken:
import { bar } from '@samirdamle/nano-charts/bar';

const scene = line([4, 9, 2, 7, 5]);
const svg   = toSVG(scene); // '<svg viewBox="0 0 100 20" role="img">…</svg>'
```

**Every chart signature:** `(data, options?) => Scene`. Options are per-chart typed but
share a common base:

```ts
interface BaseOptions {
  width?: number;    // default per chart (small, e.g. 100)
  height?: number;   // default per chart (e.g. 20)
  color?: string;    // default 'currentColor'
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  title?: string;    // a11y <title>; else auto-generated
  desc?: string;     // a11y <desc>;  else auto-generated summary
}
```

`toSVG(scene, { className?, style?, attrs? })` returns an `<svg>` string with `viewBox`,
`role="img"`, and `preserveAspectRatio`. It never sets fixed pixel width/height unless
asked, so CSS can size it responsively.

## 6. Per-chart summary

| Function | Encodes | Data | Key options | Primary marks |
|----------|---------|------|-------------|---------------|
| `line` | trend | series | `curve?`, `dot?` (last/all/none) | polyline (+circle) |
| `area` | trend + volume | series | `curve?`, `baseline?` | path (fill) + polyline |
| `bar` | magnitude | series or nested (stacked) | `gap?`, `stacked` (auto), `radius?` | rect[] |
| `winLoss` | direction/sign | series | `neutralAtZero?` | rect[] (uniform height, center baseline) |
| `bullet` | value vs target | `{value,target,ranges?}` | `orientation?` (default horizontal) | rect (ranges) + rect (value) + line (target) |
| `donut` | proportion | `{value,max}` or segments | `thickness?`, `startAngle?` | path arcs |
| `scatter` | 2D relationship | 2D points | `radius?` | circle[] |
| `heatmap` | intensity grid | matrix | `colorScale`, `gap?`, `radius?` | rect[] |

Notes:
- `winLoss`: all bars equal height; up = positive (win color), down = negative (loss
  color), optional flat tick at zero. Center baseline.
- `donut`: gauge mode = one arc of `value/max` over a track; segment mode = arcs sized
  by each segment's share of the total.
- `heatmap`: introduces the only new subsystem — a **color scale** (see §7).

## 7. Color & theming

- **Default `currentColor`.** Stroke/fill default to `currentColor` so a chart inherits
  the text color of its container — dark mode and per-cell theming work with no config.
- **Explicit `color`** option overrides.
- **Color scale (heatmap only).** `colorScale` maps value → color:
  - default: linear interpolation between two endpoint colors (`[from, to]`, default
    derived from `color`),
  - or a user function `(value, { min, max }) => string` for diverging/threshold scales.
  Implementation is a tiny linear-domain RGB lerp, in its own module so non-heatmap
  charts never bundle it.

## 8. Accessibility

Every scene carries `a11y.title` and `a11y.desc`. When the user doesn't supply them,
generate a concise summary from the data (e.g. `line`: "line chart, 5 points, trend up,
min 2, max 9"). `toSVG` emits `role="img"`, `<title>`, and `<desc>` wired via
`aria-labelledby`. Wrappers reuse the same strings.

## 9. Coordinate system, scaling, determinism

- Charts compute in a small internal coordinate space (default e.g. 100×20) and expose
  it via `viewBox`; `preserveAspectRatio` handles responsive sizing so a chart can be
  sized purely with CSS.
- No DOM reads, no `Math.random`, no `Date.now`, no text measurement. Given identical
  inputs the `Scene` and its serialized SVG are byte-identical — enabling snapshot tests
  and safe SSR.
- Numeric output is rounded to a fixed precision (e.g. 2 decimals) for stable snapshots
  and smaller SVG strings.

## 10. Package structure & exports

```
src/
  index.ts            # re-exports all charts + toSVG + types
  types.ts            # Scene, Mark, ScenePoint, option interfaces
  core/
    normalize.ts      # input-form detection → canonical datum
    scale.ts          # linear domain→range mapping (series)
    color-scale.ts    # value→color (heatmap only)
    geometry.ts       # shared helpers (extent, path builders, arc)
    a11y.ts           # summary generation
  charts/
    line.ts area.ts bar.ts win-loss.ts bullet.ts donut.ts scatter.ts heatmap.ts
  render/
    to-svg.ts         # Scene → SVG string
tests/                # Vitest, incl. SVG snapshots
```

`package.json` `exports` map provides the barrel plus per-chart subpaths, each with
`import` (ESM), `require` (CJS), and `types` conditions. `sideEffects: false`.

## 11. Tooling, build, testing, release

- **Package manager:** pnpm.
- **Build:** `tsup` → dual ESM + CJS + `.d.ts`, per-entry (barrel + each chart).
- **Test:** Vitest — unit tests for normalization/scales/geometry, SVG snapshot tests
  per chart, determinism tests (same input twice → identical output).
- **Lint/format:** ESLint + Prettier.
- **Bundle budget:** `size-limit` in CI; per-chart budget target ~**<1KB gzipped**
  (individual import), enforced so regressions fail the build.
- **Release:** Changesets → publish to npm as `@samirdamle/nano-charts` (public access).
- **CI:** GitHub Actions — install, lint, typecheck, test, size-limit on PRs; Changesets
  release on main.
- **License:** MIT.

## 12. Testing strategy (what "correct" means)

- **Normalization:** each input form → identical canonical datums; accessor precedence;
  bar scalar-vs-array stacking detection.
- **Scales/geometry:** extent handling incl. all-equal values, single point, empty
  input (graceful empty scene), negative values.
- **Per-chart snapshots:** representative inputs produce expected marks/SVG; edge cases
  (1 point, 0 points, all-equal, negatives) render sanely.
- **a11y:** auto summaries present and sensible; role/title/desc wired in SVG.
- **Determinism:** repeated calls byte-identical.
- **Size:** each chart's independent import stays within budget.

## 13. Future (out of scope for v1)

- `@samirdamle/nano-charts-react` wrapper (consumes `scene.points` for hover/click).
- Interactive playground/docs site.
- Bubble (size-encoded) scatter; explicit per-point x / time scaling for series.
- Additional scales (log), more color-scale presets.
