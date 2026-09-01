# nano-charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@samirdamle/nano-charts` — a zero-dependency, tree-shakeable TypeScript library that computes tiny SVG charts (line, area, bar, winLoss, bullet, donut, scatter, heatmap) as a renderer-agnostic scene model, plus a `toSVG` serializer.

**Architecture:** Each chart is a pure `(data, options?) => Scene` function. A `Scene` holds computed primitive `marks` (polyline/path/rect/circle/line), data-bound `points` (for wrapper interactivity), and `a11y` metadata. Shared core modules (normalize, geometry, plot layout, a11y, color-scale) are factored out; renderers (`toSVG`, and future framework wrappers) only walk `scene.marks`.

**Tech Stack:** TypeScript, pnpm, tsup (dual ESM+CJS + d.ts), Vitest, ESLint + Prettier, size-limit, Changesets, GitHub Actions. Zero runtime dependencies.

## Global Constraints

- Package name: `@samirdamle/nano-charts`, `"private": false`, published with `--access public`.
- **Zero runtime dependencies** (`dependencies: {}`). Everything else is `devDependencies`.
- TypeScript `strict: true`. Target ES2020. `"type": "module"`.
- `"sideEffects": false`. Each chart independently importable via subpath (`@samirdamle/nano-charts/bar`).
- **Deterministic & SSR-safe:** no DOM reads, no `Math.random`, no `Date.now`, no text measurement. Identical input → byte-identical output.
- All emitted numbers rounded to 2 decimals via the shared `round` helper.
- Default color is the string `'currentColor'`; charts inherit container text color.
- Default internal coordinate space for series charts: `width: 100`, `height: 20`. `viewBox` + `preserveAspectRatio` drive responsive sizing.
- License: MIT. Node engines `>=18`.
- camelCase function names (`winLoss`), kebab-case file names (`win-loss.ts`).

---

## File Structure

```
src/
  index.ts              # barrel: re-export all charts + toSVG + types
  types.ts              # Scene, Mark, ScenePoint, BaseOptions, Datum, accessor types
  core/
    geometry.ts         # extent, round, linearScale
    normalize.ts        # series input-form detection → Datum[]
    plot.ts             # resolvePadding, seriesLayout
    a11y.ts             # seriesSummary, trend/formatting helpers
    color-scale.ts      # parseColor, lerpColor, makeColorScale (heatmap only)
  charts/
    line.ts area.ts bar.ts win-loss.ts scatter.ts bullet.ts donut.ts heatmap.ts
  render/
    to-svg.ts           # Scene → SVG string
tests/                  # Vitest specs mirroring src/
```

Each `src/charts/*.ts` file exports its chart function and its options interface. `src/index.ts` and per-chart subpaths are wired in the final task.

---

### Task 1: Project scaffolding & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc.json`, `.editorconfig`
- Create: `src/index.ts` (temporary smoke export), `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: working `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lint` scripts.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@samirdamle/nano-charts",
  "version": "0.0.0",
  "description": "Extremely lightweight, zero-dependency TypeScript library for tiny SVG charts.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "size": "size-limit"
  },
  "dependencies": {},
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.6",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3",
    "size-limit": "^11.1.6",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write `tsup.config.ts`** (entries added per-chart in the final task; start with index only)

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  outDir: 'dist',
});
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 5: Write `.eslintrc.cjs`, `.prettierrc.json`, `.editorconfig`**

`.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2021: true },
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
};
```

`.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`.editorconfig`:
```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
```

- [ ] **Step 6: Write temporary smoke export `src/index.ts`**

```ts
export const version = '0.0.0';
```

- [ ] **Step 7: Write `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { version } from '../src/index';

describe('smoke', () => {
  it('exports a version string', () => {
    expect(typeof version).toBe('string');
  });
});
```

- [ ] **Step 8: Install and verify the toolchain**

Run: `pnpm install`
Then run: `pnpm test && pnpm typecheck && pnpm build`
Expected: tests pass (1 passed), typecheck clean, `dist/index.js` + `dist/index.cjs` + `dist/index.d.ts` produced.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold project tooling (tsup, vitest, eslint, prettier)"
```

---

### Task 2: Core types & geometry helpers

**Files:**
- Create: `src/types.ts`, `src/core/geometry.ts`
- Test: `tests/core/geometry.test.ts`

**Interfaces:**
- Produces:
  - `type Datum = { id: string | number; label: string; value: number; index: number }`
  - `interface Scene { width: number; height: number; viewBox: string; marks: Mark[]; points: ScenePoint[]; a11y: { title: string; desc: string } }`
  - `type Mark` (union below), `interface ScenePoint`, `interface BaseOptions`
  - `round(n: number, precision?: number): number`
  - `extent(values: number[]): [number, number]`
  - `linearScale(domain: [number, number], range: [number, number]): (v: number) => number`

- [ ] **Step 1: Write `src/types.ts`** (no runtime test needed; consumed everywhere)

```ts
export type Datum = { id: string | number; label: string; value: number; index: number };

export type Mark =
  | { type: 'polyline'; points: [number, number][]; stroke?: string; strokeWidth?: number; fill?: 'none' }
  | { type: 'path'; d: string; fill?: string; fillOpacity?: number; stroke?: string; strokeWidth?: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill?: string; fillOpacity?: number; rx?: number }
  | { type: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number };

export interface ScenePoint {
  id: string | number;
  label: string;
  value: number;
  index: number;
  x: number;
  y: number;
  row?: number;
  col?: number;
  w?: number;
  h?: number;
}

export interface Scene {
  width: number;
  height: number;
  viewBox: string;
  marks: Mark[];
  points: ScenePoint[];
  a11y: { title: string; desc: string };
}

export type Padding = number | { top?: number; right?: number; bottom?: number; left?: number };

export interface BaseOptions {
  width?: number;
  height?: number;
  color?: string;
  padding?: Padding;
  title?: string;
  desc?: string;
}
```

- [ ] **Step 2: Write the failing test `tests/core/geometry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { round, extent, linearScale } from '../../src/core/geometry';

describe('round', () => {
  it('rounds to 2 decimals by default', () => {
    expect(round(1.23456)).toBe(1.23);
    expect(round(19)).toBe(19);
  });
});

describe('extent', () => {
  it('returns [min, max]', () => {
    expect(extent([4, 9, 2, 7])).toEqual([2, 9]);
  });
  it('handles a single value', () => {
    expect(extent([5])).toEqual([5, 5]);
  });
  it('returns [0, 0] for empty input', () => {
    expect(extent([])).toEqual([0, 0]);
  });
});

describe('linearScale', () => {
  it('maps domain to range', () => {
    const s = linearScale([0, 10], [19, 1]);
    expect(s(0)).toBe(19);
    expect(s(10)).toBe(1);
    expect(s(5)).toBe(10);
  });
  it('returns range midpoint when domain is degenerate', () => {
    const s = linearScale([5, 5], [1, 19]);
    expect(s(5)).toBe(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/geometry.test.ts`
Expected: FAIL — cannot find module `../../src/core/geometry`.

- [ ] **Step 4: Write `src/core/geometry.ts`**

```ts
export function round(n: number, precision = 2): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

export function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

export function linearScale(
  domain: [number, number],
  range: [number, number],
): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  const m = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/geometry.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/core/geometry.ts tests/core/geometry.test.ts
git commit -m "feat: add core types and geometry helpers"
```

---

### Task 3: Series input normalization

**Files:**
- Create: `src/core/normalize.ts`
- Test: `tests/core/normalize.test.ts`

**Interfaces:**
- Consumes: `Datum` from `src/types.ts`.
- Produces:
  - `type ValueAccessor<T> = (row: T, index: number) => number`
  - `type LabelAccessor<T> = (row: T, index: number) => string`
  - `type IdAccessor<T> = (row: T, index: number) => string | number`
  - `interface SeriesAccessors<T> { value: ValueAccessor<T>; label?: LabelAccessor<T>; id?: IdAccessor<T> }`
  - `type SeriesInput<T> = number[] | Array<{ id?: string | number; label?: string; value: number }> | T[]`
  - `normalizeSeries<T>(data: SeriesInput<T>, accessors?: SeriesAccessors<T>): Datum[]`

- [ ] **Step 1: Write the failing test `tests/core/normalize.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeSeries } from '../../src/core/normalize';

describe('normalizeSeries', () => {
  it('form 1: number[] derives id and label from index/value', () => {
    expect(normalizeSeries([4, 9])).toEqual([
      { id: 0, label: '4', value: 4, index: 0 },
      { id: 1, label: '9', value: 9, index: 1 },
    ]);
  });

  it('form 3: {id,label,value}[] uses keys directly', () => {
    const out = normalizeSeries([{ id: 'a', label: 'Jan', value: 3 }]);
    expect(out).toEqual([{ id: 'a', label: 'Jan', value: 3, index: 0 }]);
  });

  it('form 3: missing id/label fall back to index/value', () => {
    const out = normalizeSeries([{ value: 7 }]);
    expect(out).toEqual([{ id: 0, label: '7', value: 7, index: 0 }]);
  });

  it('form 2: accessors pull value/label/id from arbitrary objects', () => {
    const rows = [{ sku: 'x', month: 'Jan', rev: 12 }];
    const out = normalizeSeries(rows, {
      value: (r) => r.rev,
      label: (r) => r.month,
      id: (r) => r.sku,
    });
    expect(out).toEqual([{ id: 'x', label: 'Jan', value: 12, index: 0 }]);
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeSeries([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/normalize.test.ts`
Expected: FAIL — cannot find module `../../src/core/normalize`.

- [ ] **Step 3: Write `src/core/normalize.ts`**

```ts
import type { Datum } from '../types';

export type ValueAccessor<T> = (row: T, index: number) => number;
export type LabelAccessor<T> = (row: T, index: number) => string;
export type IdAccessor<T> = (row: T, index: number) => string | number;

export interface SeriesAccessors<T> {
  value: ValueAccessor<T>;
  label?: LabelAccessor<T>;
  id?: IdAccessor<T>;
}

type ObjectPoint = { id?: string | number; label?: string; value: number };
export type SeriesInput<T> = number[] | ObjectPoint[] | T[];

export function normalizeSeries<T>(
  data: SeriesInput<T>,
  accessors?: SeriesAccessors<T>,
): Datum[] {
  if (data.length === 0) return [];

  if (accessors) {
    return (data as T[]).map((row, index) => ({
      id: accessors.id ? accessors.id(row, index) : index,
      label: accessors.label ? accessors.label(row, index) : String(accessors.value(row, index)),
      value: accessors.value(row, index),
      index,
    }));
  }

  if (typeof data[0] === 'number') {
    return (data as number[]).map((value, index) => ({
      id: index,
      label: String(value),
      value,
      index,
    }));
  }

  return (data as ObjectPoint[]).map((d, index) => ({
    id: d.id ?? index,
    label: d.label ?? String(d.value),
    value: d.value,
    index,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/normalize.ts tests/core/normalize.test.ts
git commit -m "feat: add series input normalization"
```

---

### Task 4: Plot layout (padding + series scales)

**Files:**
- Create: `src/core/plot.ts`
- Test: `tests/core/plot.test.ts`

**Interfaces:**
- Consumes: `linearScale` from `src/core/geometry`, `Padding` from `src/types`.
- Produces:
  - `interface ResolvedPadding { top: number; right: number; bottom: number; left: number }`
  - `resolvePadding(p: Padding | undefined, def?: number): ResolvedPadding`
  - `interface SeriesLayout { x: (index: number) => number; y: (value: number) => number; left: number; right: number; top: number; bottom: number }`
  - `seriesLayout(count: number, domain: [number, number], box: { width: number; height: number; padding: ResolvedPadding }): SeriesLayout`

- [ ] **Step 1: Write the failing test `tests/core/plot.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolvePadding, seriesLayout } from '../../src/core/plot';

describe('resolvePadding', () => {
  it('expands a number to all sides', () => {
    expect(resolvePadding(2)).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });
  it('merges a partial object over the default', () => {
    expect(resolvePadding({ left: 4 }, 1)).toEqual({ top: 1, right: 1, bottom: 1, left: 4 });
  });
  it('uses the default of 1 when undefined', () => {
    expect(resolvePadding(undefined)).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
  });
});

describe('seriesLayout', () => {
  const box = { width: 100, height: 20, padding: { top: 1, right: 1, bottom: 1, left: 1 } };

  it('maps index across the inner width and value up the inner height', () => {
    const l = seriesLayout(3, [0, 10], box);
    expect(l.x(0)).toBe(1);
    expect(l.x(2)).toBe(99);
    expect(l.y(0)).toBe(19);
    expect(l.y(10)).toBe(1);
  });

  it('centers a single point horizontally', () => {
    const l = seriesLayout(1, [0, 10], box);
    expect(l.x(0)).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/plot.test.ts`
Expected: FAIL — cannot find module `../../src/core/plot`.

- [ ] **Step 3: Write `src/core/plot.ts`**

```ts
import type { Padding } from '../types';
import { linearScale } from './geometry';

export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function resolvePadding(p: Padding | undefined, def = 1): ResolvedPadding {
  if (p === undefined) return { top: def, right: def, bottom: def, left: def };
  if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
  return { top: p.top ?? def, right: p.right ?? def, bottom: p.bottom ?? def, left: p.left ?? def };
}

export interface SeriesLayout {
  x: (index: number) => number;
  y: (value: number) => number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function seriesLayout(
  count: number,
  domain: [number, number],
  box: { width: number; height: number; padding: ResolvedPadding },
): SeriesLayout {
  const { width, height, padding } = box;
  const left = padding.left;
  const right = width - padding.right;
  const top = padding.top;
  const bottom = height - padding.bottom;
  const x =
    count <= 1 ? () => (left + right) / 2 : linearScale([0, count - 1], [left, right]);
  const y = linearScale(domain, [bottom, top]);
  return { x, y, left, right, top, bottom };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/plot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/plot.ts tests/core/plot.test.ts
git commit -m "feat: add plot layout helpers (padding + series scales)"
```

---

### Task 5: Accessibility summaries

**Files:**
- Create: `src/core/a11y.ts`
- Test: `tests/core/a11y.test.ts`

**Interfaces:**
- Consumes: `Datum` from `src/types`.
- Produces: `seriesSummary(kind: string, datums: Datum[]): { title: string; desc: string }`

- [ ] **Step 1: Write the failing test `tests/core/a11y.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { seriesSummary } from '../../src/core/a11y';

const d = (value: number, index: number) => ({ id: index, label: String(value), value, index });

describe('seriesSummary', () => {
  it('reports kind, count, trend, min and max', () => {
    const out = seriesSummary('line', [d(2, 0), d(9, 1)]);
    expect(out.title).toBe('line chart');
    expect(out.desc).toBe('line chart, 2 points, trend up, min 2, max 9');
  });

  it('detects a downward trend', () => {
    const out = seriesSummary('bar', [d(9, 0), d(2, 1)]);
    expect(out.desc).toContain('trend down');
  });

  it('reports flat when first equals last', () => {
    const out = seriesSummary('line', [d(5, 0), d(5, 1)]);
    expect(out.desc).toContain('trend flat');
  });

  it('handles an empty series', () => {
    expect(seriesSummary('line', [])).toEqual({
      title: 'line chart',
      desc: 'line chart, no data',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/a11y.test.ts`
Expected: FAIL — cannot find module `../../src/core/a11y`.

- [ ] **Step 3: Write `src/core/a11y.ts`**

```ts
import type { Datum } from '../types';
import { extent } from './geometry';

export function seriesSummary(kind: string, datums: Datum[]): { title: string; desc: string } {
  const title = `${kind} chart`;
  if (datums.length === 0) return { title, desc: `${title}, no data` };
  const values = datums.map((d) => d.value);
  const [min, max] = extent(values);
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const trend = last > first ? 'up' : last < first ? 'down' : 'flat';
  const desc = `${title}, ${datums.length} points, trend ${trend}, min ${min}, max ${max}`;
  return { title, desc };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/a11y.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/a11y.ts tests/core/a11y.test.ts
git commit -m "feat: add accessibility summary generation"
```

---

### Task 6: SVG serializer (`toSVG`)

**Files:**
- Create: `src/render/to-svg.ts`
- Test: `tests/render/to-svg.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Mark` from `src/types`.
- Produces: `toSVG(scene: Scene, opts?: { className?: string; style?: string; attrs?: Record<string, string | number> }): string`

**Design notes:** Emits `role="img"`, a `<title>` (accessible name) and `<desc>`. Deliberately does **not** use `aria-labelledby` — ids can't be made unique across the many repeated charts on a page without breaking determinism, so `<title>` is used as the accessible name instead. No fixed `width`/`height` attributes unless supplied via `attrs`, so CSS controls size. Color attributes omitted from a mark fall back to `currentColor` via a single `fill`/`stroke` on the root `<svg>`.

- [ ] **Step 1: Write the failing test `tests/render/to-svg.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toSVG } from '../../src/render/to-svg';
import type { Scene } from '../../src/types';

const scene: Scene = {
  width: 100,
  height: 20,
  viewBox: '0 0 100 20',
  marks: [
    { type: 'polyline', points: [[1, 19], [50, 1], [99, 10]], fill: 'none' },
    { type: 'circle', cx: 99, cy: 10, r: 1 },
  ],
  points: [],
  a11y: { title: 'line chart', desc: 'line chart, 3 points, trend up, min 0, max 10' },
};

describe('toSVG', () => {
  it('wraps marks in an accessible svg with a viewBox', () => {
    const svg = toSVG(scene);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 20"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>line chart</title>');
    expect(svg).toContain('<desc>line chart, 3 points, trend up, min 0, max 10</desc>');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('stroke="currentColor"');
  });

  it('serializes a polyline and a circle', () => {
    const svg = toSVG(scene);
    expect(svg).toContain('<polyline points="1,19 50,1 99,10" fill="none"');
    expect(svg).toContain('<circle cx="99" cy="10" r="1"');
  });

  it('is deterministic', () => {
    expect(toSVG(scene)).toBe(toSVG(scene));
  });

  it('applies className and extra attrs', () => {
    const svg = toSVG(scene, { className: 'spark', attrs: { width: 100, height: 20 } });
    expect(svg).toContain('class="spark"');
    expect(svg).toContain('width="100"');
  });

  it('escapes special characters in a11y text', () => {
    const svg = toSVG({ ...scene, a11y: { title: 'A & B <x>', desc: 'd' } });
    expect(svg).toContain('<title>A &amp; B &lt;x&gt;</title>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/render/to-svg.test.ts`
Expected: FAIL — cannot find module `../../src/render/to-svg`.

- [ ] **Step 3: Write `src/render/to-svg.ts`**

```ts
import type { Mark, Scene } from '../types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function attr(name: string, value: string | number | undefined): string {
  return value === undefined ? '' : ` ${name}="${value}"`;
}

function renderMark(m: Mark): string {
  switch (m.type) {
    case 'polyline': {
      const pts = m.points.map(([x, y]) => `${x},${y}`).join(' ');
      return `<polyline points="${pts}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    }
    case 'path':
      return `<path d="${m.d}"${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'rect':
      return `<rect x="${m.x}" y="${m.y}" width="${m.width}" height="${m.height}"${attr('rx', m.rx)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}/>`;
    case 'circle':
      return `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'line':
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}"${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
  }
}

export function toSVG(
  scene: Scene,
  opts: { className?: string; style?: string; attrs?: Record<string, string | number> } = {},
): string {
  const extra = opts.attrs
    ? Object.entries(opts.attrs)
        .map(([k, v]) => attr(k, v))
        .join('')
    : '';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const style = opts.style ? ` style="${opts.style}"` : '';
  const body = scene.marks.map(renderMark).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.viewBox}" ` +
    `role="img" fill="currentColor" stroke="currentColor"${cls}${style}${extra}>` +
    `<title>${esc(scene.a11y.title)}</title><desc>${esc(scene.a11y.desc)}</desc>` +
    `${body}</svg>`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/render/to-svg.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/to-svg.ts tests/render/to-svg.test.ts
git commit -m "feat: add SVG serializer"
```

---

### Task 7: `line` chart

**Files:**
- Create: `src/charts/line.ts`
- Test: `tests/charts/line.test.ts`

**Interfaces:**
- Consumes: `normalizeSeries`, `SeriesAccessors`, `SeriesInput` (normalize); `resolvePadding`, `seriesLayout` (plot); `extent`, `round` (geometry); `seriesSummary` (a11y); `Scene`, `BaseOptions` (types).
- Produces:
  - `interface LineOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> { dot?: 'none' | 'last' | 'all'; strokeWidth?: number }`
  - `line<T>(data: SeriesInput<T>, options?: LineOptions<T>): Scene`

**Shared convention for all series charts:** `options` doubles as the accessor bag — if `options.value` is a function, the accessor form is used. A small internal `toDatums(data, options)` (defined here, re-used pattern in later charts) picks accessors out of options.

- [ ] **Step 1: Write the failing test `tests/charts/line.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { line } from '../../src/charts/line';

describe('line', () => {
  it('produces a polyline through scaled points', () => {
    const scene = line([0, 10, 5]);
    expect(scene.viewBox).toBe('0 0 100 20');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(poly).toEqual({
      type: 'polyline',
      points: [[1, 19], [50, 1], [99, 10]],
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1,
    });
  });

  it('exposes data-bound points for interactivity', () => {
    const scene = line([0, 10, 5]);
    expect(scene.points).toEqual([
      { id: 0, label: '0', value: 0, index: 0, x: 1, y: 19 },
      { id: 1, label: '10', value: 10, index: 1, x: 50, y: 1 },
      { id: 2, label: '5', value: 5, index: 2, x: 99, y: 10 },
    ]);
  });

  it('adds only the last dot when dot="last"', () => {
    const scene = line([0, 10, 5], { dot: 'last' });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ cx: 99, cy: 10 });
  });

  it('accepts accessors', () => {
    const scene = line([{ v: 0 }, { v: 10 }], { value: (r: { v: number }) => r.v });
    expect(scene.points.map((p) => p.value)).toEqual([0, 10]);
  });

  it('generates an a11y summary', () => {
    expect(line([0, 10, 5]).a11y.desc).toBe('line chart, 3 points, trend up, min 0, max 10');
  });

  it('renders an empty scene for empty data', () => {
    const scene = line([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/line.test.ts`
Expected: FAIL — cannot find module `../../src/charts/line`.

- [ ] **Step 3: Write `src/charts/line.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface LineOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  dot?: 'none' | 'last' | 'all';
  strokeWidth?: number;
}

export function line<T = number>(data: SeriesInput<T>, options: LineOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const strokeWidth = options.strokeWidth ?? 1;
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const a11y = {
    title: options.title ?? seriesSummary('line', datums).title,
    desc: options.desc ?? seriesSummary('line', datums).desc,
  };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (datums.length === 0) return base;

  const layout = seriesLayout(datums.length, extent(datums.map((d) => d.value)), {
    width,
    height,
    padding,
  });

  const points: ScenePoint[] = datums.map((d) => ({
    id: d.id,
    label: d.label,
    value: d.value,
    index: d.index,
    x: round(layout.x(d.index)),
    y: round(layout.y(d.value)),
  }));

  const marks: Mark[] = [
    {
      type: 'polyline',
      points: points.map((p) => [p.x, p.y] as [number, number]),
      fill: 'none',
      stroke: color,
      strokeWidth,
    },
  ];

  if (options.dot && options.dot !== 'none') {
    const dotted = options.dot === 'last' ? points.slice(-1) : points;
    for (const p of dotted) marks.push({ type: 'circle', cx: p.x, cy: p.y, r: 1, fill: color });
  }

  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/line.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/line.ts tests/charts/line.test.ts
git commit -m "feat: add line chart"
```

---

### Task 8: `area` chart

**Files:**
- Create: `src/charts/area.ts`
- Test: `tests/charts/area.test.ts`

**Interfaces:**
- Consumes: same core modules as `line`.
- Produces:
  - `interface AreaOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> { strokeWidth?: number; fillOpacity?: number }`
  - `area<T>(data: SeriesInput<T>, options?: AreaOptions<T>): Scene`

- [ ] **Step 1: Write the failing test `tests/charts/area.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { area } from '../../src/charts/area';

describe('area', () => {
  it('produces a filled path to the baseline plus a top stroke', () => {
    const scene = area([0, 10, 5]);
    const path = scene.marks.find((m) => m.type === 'path');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(path).toEqual({
      type: 'path',
      d: 'M1,19 L1,19 L50,1 L99,10 L99,19 Z',
      fill: 'currentColor',
      fillOpacity: 0.2,
    });
    expect(poly).toMatchObject({ type: 'polyline', points: [[1, 19], [50, 1], [99, 10]] });
  });

  it('exposes the same points as line', () => {
    expect(area([0, 10, 5]).points.map((p) => [p.x, p.y])).toEqual([[1, 19], [50, 1], [99, 10]]);
  });

  it('renders an empty scene for empty data', () => {
    expect(area([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/area.test.ts`
Expected: FAIL — cannot find module `../../src/charts/area`.

- [ ] **Step 3: Write `src/charts/area.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface AreaOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  strokeWidth?: number;
  fillOpacity?: number;
}

export function area<T = number>(data: SeriesInput<T>, options: AreaOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const strokeWidth = options.strokeWidth ?? 1;
  const fillOpacity = options.fillOpacity ?? 0.2;
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('area', datums);
  const a11y = { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (datums.length === 0) return base;

  const layout = seriesLayout(datums.length, extent(datums.map((d) => d.value)), {
    width,
    height,
    padding,
  });

  const points: ScenePoint[] = datums.map((d) => ({
    id: d.id,
    label: d.label,
    value: d.value,
    index: d.index,
    x: round(layout.x(d.index)),
    y: round(layout.y(d.value)),
  }));

  const bottom = round(layout.bottom);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const d =
    `M${first.x},${bottom} ` +
    points.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${last.x},${bottom} Z`;

  const marks: Mark[] = [
    { type: 'path', d, fill: color, fillOpacity },
    {
      type: 'polyline',
      points: points.map((p) => [p.x, p.y] as [number, number]),
      fill: 'none',
      stroke: color,
      strokeWidth,
    },
  ];

  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/area.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/area.ts tests/charts/area.test.ts
git commit -m "feat: add area chart"
```

---

### Task 9: `bar` chart (simple + stacked)

**Files:**
- Create: `src/charts/bar.ts`
- Test: `tests/charts/bar.test.ts`

**Interfaces:**
- Consumes: `normalizeSeries`, `SeriesAccessors`; `resolvePadding`, `seriesLayout`; `round`; `seriesSummary`.
- Produces:
  - `interface BarOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> { gap?: number; radius?: number }`
  - `type BarInput<T> = SeriesInput<T> | number[][] | Array<Array<{ id?: string | number; label?: string; value: number }>> | T[][]`
  - `bar<T>(data: BarInput<T>, options?: BarOptions<T>): Scene`

**Design:** A data element that is an array → a stacked column of its segments; otherwise a single column. Domain is `[min(0, minTotal), max(0, maxTotal)]` where a column's total is the sum of its segment values (simple columns have one segment). Bars grow from the value-0 baseline. `gap` is the fraction (0–1, default 0.2) of each slot used as spacing. Stacked segments after the first alternate `fill-opacity` (1, then 0.6, 0.4…) so they're distinguishable with a single color.

- [ ] **Step 1: Write the failing test `tests/charts/bar.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bar } from '../../src/charts/bar';

describe('bar (simple)', () => {
  it('produces one rect per value growing from the zero baseline', () => {
    const scene = bar([4, 9, 2, 7]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // slot = 98/4 = 24.5, gap 0.2 -> barW = 19.6, x0 = 1 + (24.5-19.6)/2 = 3.45
    expect(rects[0]).toMatchObject({ x: 3.45, width: 19.6 });
    // domain [0,9] -> y(9)=1 (top), y(4)=11, baseline y(0)=19
    expect(rects[1]).toMatchObject({ y: 1, height: 18 }); // tallest (value 9)
  });

  it('exposes one point per column', () => {
    expect(bar([4, 9]).points).toHaveLength(2);
  });
});

describe('bar (stacked)', () => {
  it('stacks segment rects within each column', () => {
    const scene = bar([[3, 2], [5, 4]]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // 2 columns x 2 segments = 4 rects
    expect(rects).toHaveLength(4);
    // totals: 5 and 9 -> domain [0,9]
  });

  it('exposes one point per segment with row/col', () => {
    const scene = bar([[3, 2], [5, 4]]);
    expect(scene.points).toHaveLength(4);
    expect(scene.points[0]).toMatchObject({ col: 0, row: 0, value: 3 });
  });
});

describe('bar (edges)', () => {
  it('renders an empty scene for empty data', () => {
    expect(bar([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/bar.test.ts`
Expected: FAIL — cannot find module `../../src/charts/bar`.

- [ ] **Step 3: Write `src/charts/bar.ts`**

```ts
import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface BarOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  gap?: number;
  radius?: number;
}

type BarSegment<T> = number | { id?: string | number; label?: string; value: number } | T;
export type BarInput<T = number> = Array<BarSegment<T> | BarSegment<T>[]>;

export function bar<T = number>(data: BarInput<T>, options: BarOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const gap = options.gap ?? 0.2;
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;

  // Normalize into columns of segment-datums.
  const columns: Datum[][] = data.map((d, col) => {
    const segs = (Array.isArray(d) ? d : [d]) as SeriesInput<T>;
    return normalizeSeries(segs, accessors).map((s) => ({ ...s, index: col }));
  });

  const totals = columns.map((segs) => segs.reduce((sum, s) => sum + s.value, 0));
  const flat: Datum[] = columns.map((segs, col) => ({
    id: col,
    label: String(totals[col]),
    value: totals[col]!,
    index: col,
  }));
  const summary = seriesSummary('bar', flat);
  const a11y = { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (columns.length === 0) return base;

  const [minT, maxT] = extent(totals);
  const layout = seriesLayout(columns.length, [Math.min(0, minT), Math.max(0, maxT)], {
    width,
    height,
    padding,
  });
  const slot = (layout.right - layout.left) / columns.length;
  const barW = slot * (1 - gap);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  columns.forEach((segs, col) => {
    const x = round(layout.left + col * slot + (slot - barW) / 2);
    let cursor = 0; // running stacked value
    segs.forEach((seg, row) => {
      const yTop = round(layout.y(cursor + seg.value));
      const yBottom = round(layout.y(cursor));
      const h = round(yBottom - yTop);
      marks.push({
        type: 'rect',
        x,
        y: yTop,
        width: round(barW),
        height: h,
        fill: color,
        fillOpacity: row === 0 ? 1 : Math.max(0.4, 1 - row * 0.3),
        rx: options.radius,
      });
      points.push({
        id: seg.id,
        label: seg.label,
        value: seg.value,
        index: col,
        col,
        row,
        x,
        y: yTop,
        w: round(barW),
        h,
      });
      cursor += seg.value;
    });
  });

  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/bar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/bar.ts tests/charts/bar.test.ts
git commit -m "feat: add bar chart with stacking support"
```

---

### Task 10: `winLoss` chart

**Files:**
- Create: `src/charts/win-loss.ts`
- Test: `tests/charts/win-loss.test.ts`

**Interfaces:**
- Consumes: `normalizeSeries`, `SeriesAccessors`; `resolvePadding`; `round`; `seriesSummary`.
- Produces:
  - `interface WinLossOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> { gap?: number; winColor?: string; lossColor?: string }`
  - `winLoss<T>(data: SeriesInput<T>, options?: WinLossOptions<T>): Scene`

**Design:** Uniform-height bars on a center baseline. Positive value → bar goes up from center (win); negative → down (loss); zero → a thin flat tick at center. Magnitude is ignored. `winColor` defaults to `currentColor`; `lossColor` defaults to `currentColor` with `fill-opacity` 0.4 so a single ink color still distinguishes them.

- [ ] **Step 1: Write the failing test `tests/charts/win-loss.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { winLoss } from '../../src/charts/win-loss';

describe('winLoss', () => {
  it('draws uniform-height bars above/below the center baseline', () => {
    const scene = winLoss([1, -2, 3, -1]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // height 20, center = 10, pad 1 -> barHeight = center - top = 9
    // win (value 1): y = 1, height = 9 (top half)
    expect(rects[0]).toMatchObject({ y: 1, height: 9 });
    // loss (value -2): y = 10, height = 9 (bottom half)
    expect(rects[1]).toMatchObject({ y: 10, height: 9 });
  });

  it('renders zero as a thin center tick', () => {
    const scene = winLoss([0]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[0]!.height).toBeLessThan(2);
    expect(rects[0]!.y).toBeCloseTo(9.5, 5);
  });

  it('exposes one point per bar', () => {
    expect(winLoss([1, -1]).points).toHaveLength(2);
  });

  it('renders an empty scene for empty data', () => {
    expect(winLoss([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/win-loss.test.ts`
Expected: FAIL — cannot find module `../../src/charts/win-loss`.

- [ ] **Step 3: Write `src/charts/win-loss.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface WinLossOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  gap?: number;
  winColor?: string;
  lossColor?: string;
}

export function winLoss<T = number>(
  data: SeriesInput<T>,
  options: WinLossOptions<T> = {},
): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const gap = options.gap ?? 0.2;
  const winColor = options.winColor ?? options.color ?? 'currentColor';
  const lossColor = options.lossColor ?? options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('win/loss', datums);
  const a11y = { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (datums.length === 0) return base;

  const left = padding.left;
  const right = width - padding.right;
  const top = padding.top;
  const bottom = height - padding.bottom;
  const center = (top + bottom) / 2;
  const barHeight = center - top;
  const slot = (right - left) / datums.length;
  const barW = slot * (1 - gap);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  datums.forEach((d, i) => {
    const x = round(left + i * slot + (slot - barW) / 2);
    let y: number;
    let h: number;
    let fill: string;
    let fillOpacity: number | undefined;
    if (d.value > 0) {
      y = round(top);
      h = round(barHeight);
      fill = winColor;
    } else if (d.value < 0) {
      y = round(center);
      h = round(barHeight);
      fill = lossColor;
      fillOpacity = lossColor === winColor ? 0.4 : undefined;
    } else {
      y = round(center - 0.5);
      h = 1;
      fill = winColor;
      fillOpacity = 0.4;
    }
    marks.push({ type: 'rect', x, y, width: round(barW), height: h, fill, fillOpacity });
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x, y, w: round(barW), h });
  });

  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/win-loss.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/win-loss.ts tests/charts/win-loss.test.ts
git commit -m "feat: add winLoss chart"
```

---

### Task 11: `scatter` chart

**Files:**
- Create: `src/charts/scatter.ts`
- Test: `tests/charts/scatter.test.ts`

**Interfaces:**
- Consumes: `extent`, `round`, `linearScale`; `resolvePadding`; `Scene`, `BaseOptions`.
- Produces:
  - `interface ScatterPoint { id?: string | number; label?: string; x: number; y: number }`
  - `interface ScatterAccessors<T> { x: (row: T, i: number) => number; y: (row: T, i: number) => number; label?: (row: T, i: number) => string; id?: (row: T, i: number) => string | number }`
  - `type ScatterInput<T> = [number, number][] | ScatterPoint[] | T[]`
  - `interface ScatterOptions<T> extends BaseOptions, Partial<ScatterAccessors<T>> { radius?: number }`
  - `scatter<T>(data: ScatterInput<T>, options?: ScatterOptions<T>): Scene`

- [ ] **Step 1: Write the failing test `tests/charts/scatter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { scatter } from '../../src/charts/scatter';

describe('scatter', () => {
  it('maps [x,y] pairs into circles', () => {
    const scene = scatter([[0, 0], [10, 10]], { width: 100, height: 20, radius: 1 });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(2);
    // x domain [0,10] -> [1,99]; y domain [0,10] -> [19,1] (inverted)
    expect(circles[0]).toMatchObject({ cx: 1, cy: 19, r: 1 });
    expect(circles[1]).toMatchObject({ cx: 99, cy: 1, r: 1 });
  });

  it('accepts {x,y} objects and exposes points', () => {
    const scene = scatter([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(scene.points).toHaveLength(2);
    expect(scene.points[0]).toMatchObject({ x: 1, y: 19 });
  });

  it('accepts x/y accessors', () => {
    const scene = scatter([{ a: 0, b: 0 }, { a: 10, b: 10 }], {
      x: (r: { a: number }) => r.a,
      y: (r: { b: number }) => r.b,
    });
    expect(scene.points).toHaveLength(2);
  });

  it('renders an empty scene for empty data', () => {
    expect(scatter([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/scatter.test.ts`
Expected: FAIL — cannot find module `../../src/charts/scatter`.

- [ ] **Step 3: Write `src/charts/scatter.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import { resolvePadding } from '../core/plot';

export interface ScatterPoint {
  id?: string | number;
  label?: string;
  x: number;
  y: number;
}

export interface ScatterAccessors<T> {
  x: (row: T, i: number) => number;
  y: (row: T, i: number) => number;
  label?: (row: T, i: number) => string;
  id?: (row: T, i: number) => string | number;
}

export type ScatterInput<T = ScatterPoint> = [number, number][] | ScatterPoint[] | T[];

export interface ScatterOptions<T = ScatterPoint>
  extends BaseOptions,
    Partial<ScatterAccessors<T>> {
  radius?: number;
}

interface XY {
  id: string | number;
  label: string;
  x: number;
  y: number;
  index: number;
}

function toXY<T>(data: ScatterInput<T>, options: ScatterOptions<T>): XY[] {
  if (data.length === 0) return [];
  if (options.x && options.y) {
    const { x, y, label, id } = options;
    return (data as T[]).map((row, i) => ({
      id: id ? id(row, i) : i,
      label: label ? label(row, i) : `${x(row, i)}, ${y(row, i)}`,
      x: x(row, i),
      y: y(row, i),
      index: i,
    }));
  }
  if (Array.isArray(data[0])) {
    return (data as [number, number][]).map(([x, y], i) => ({
      id: i,
      label: `${x}, ${y}`,
      x,
      y,
      index: i,
    }));
  }
  return (data as ScatterPoint[]).map((p, i) => ({
    id: p.id ?? i,
    label: p.label ?? `${p.x}, ${p.y}`,
    x: p.x,
    y: p.y,
    index: i,
  }));
}

export function scatter<T = ScatterPoint>(
  data: ScatterInput<T>,
  options: ScatterOptions<T> = {},
): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const radius = options.radius ?? 1;
  const padding = resolvePadding(options.padding);
  const pts = toXY(data, options);

  const a11y = {
    title: options.title ?? 'scatter chart',
    desc: options.desc ?? (pts.length === 0 ? 'scatter chart, no data' : `scatter chart, ${pts.length} points`),
  };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (pts.length === 0) return base;

  const xScale = linearScale(extent(pts.map((p) => p.x)), [padding.left, width - padding.right]);
  const yScale = linearScale(extent(pts.map((p) => p.y)), [height - padding.bottom, padding.top]);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  for (const p of pts) {
    const cx = round(xScale(p.x));
    const cy = round(yScale(p.y));
    marks.push({ type: 'circle', cx, cy, r: radius, fill: color });
    points.push({ id: p.id, label: p.label, value: p.y, index: p.index, x: cx, y: cy });
  }
  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/scatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/scatter.ts tests/charts/scatter.test.ts
git commit -m "feat: add scatter chart"
```

---

### Task 12: `bullet` chart

**Files:**
- Create: `src/charts/bullet.ts`
- Test: `tests/charts/bullet.test.ts`

**Interfaces:**
- Consumes: `round`, `linearScale`; `resolvePadding`; `Scene`, `BaseOptions`.
- Produces:
  - `interface BulletData { value: number; target: number; ranges?: number[]; max?: number; id?: string | number; label?: string }`
  - `interface BulletOptions extends BaseOptions {}`
  - `bullet(data: BulletData, options?: BulletOptions): Scene`

**Design:** Horizontal. `max` defaults to `Math.max(value, target, ...ranges)`. Qualitative `ranges` (ascending thresholds) render as background band rects, progressively lighter→darker via `fill-opacity`. The measure (value) is a thin centered bar. The target is a vertical tick line.

- [ ] **Step 1: Write the failing test `tests/charts/bullet.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { bullet } from '../../src/charts/bullet';

describe('bullet', () => {
  it('renders range bands, a value bar and a target tick', () => {
    const scene = bullet({ value: 80, target: 90, ranges: [50, 75, 100] });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const lines = scene.marks.filter((m) => m.type === 'line');
    expect(rects.length).toBe(3 + 1); // 3 bands + value bar
    expect(lines).toHaveLength(1); // target tick
  });

  it('scales the value bar to the width (max = 100)', () => {
    const scene = bullet({ value: 100, target: 90, ranges: [100] }, { width: 100, height: 20 });
    const valueBar = scene.marks.filter((m) => m.type === 'rect').at(-1);
    // full width minus padding: left=1, right=99 -> width 98
    expect(valueBar).toMatchObject({ width: 98 });
  });

  it('exposes a single point carrying value and target', () => {
    const scene = bullet({ value: 80, target: 90, id: 'kpi', label: 'Revenue' });
    expect(scene.points).toHaveLength(1);
    expect(scene.points[0]).toMatchObject({ id: 'kpi', label: 'Revenue', value: 80 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/bullet.test.ts`
Expected: FAIL — cannot find module `../../src/charts/bullet`.

- [ ] **Step 3: Write `src/charts/bullet.ts`**

```ts
import type { BaseOptions, Mark, Scene } from '../types';
import { linearScale, round } from '../core/geometry';
import { resolvePadding } from '../core/plot';

export interface BulletData {
  value: number;
  target: number;
  ranges?: number[];
  max?: number;
  id?: string | number;
  label?: string;
}

export type BulletOptions = BaseOptions;

export function bullet(data: BulletData, options: BulletOptions = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);
  const ranges = (data.ranges ?? []).slice().sort((a, b) => a - b);
  const max = data.max ?? Math.max(data.value, data.target, ...ranges, 0);

  const left = padding.left;
  const right = width - padding.right;
  const top = padding.top;
  const bottom = height - padding.bottom;
  const xScale = linearScale([0, max], [left, right]);

  const marks: Mark[] = [];

  // Qualitative range bands, lightest (widest/last) drawn first so darker sits on top.
  for (let i = ranges.length - 1; i >= 0; i--) {
    marks.push({
      type: 'rect',
      x: round(left),
      y: round(top),
      width: round(xScale(ranges[i]!) - left),
      height: round(bottom - top),
      fill: color,
      fillOpacity: round(0.15 + (0.25 * (ranges.length - 1 - i)) / Math.max(1, ranges.length - 1)),
    });
  }

  // Measure (value) bar — centered, thinner.
  const barH = (bottom - top) * 0.4;
  const barY = top + (bottom - top - barH) / 2;
  marks.push({
    type: 'rect',
    x: round(left),
    y: round(barY),
    width: round(xScale(data.value) - left),
    height: round(barH),
    fill: color,
  });

  // Target tick.
  const tx = round(xScale(data.target));
  marks.push({ type: 'line', x1: tx, y1: round(top), x2: tx, y2: round(bottom), stroke: color, strokeWidth: 1 });

  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks,
    points: [
      {
        id: data.id ?? 0,
        label: data.label ?? String(data.value),
        value: data.value,
        index: 0,
        x: round(xScale(data.value)),
        y: round((top + bottom) / 2),
      },
    ],
    a11y: {
      title: options.title ?? 'bullet chart',
      desc: options.desc ?? `bullet chart, value ${data.value}, target ${data.target}, max ${max}`,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/bullet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/bullet.ts tests/charts/bullet.test.ts
git commit -m "feat: add bullet chart"
```

---

### Task 13: `donut` chart (gauge + segments)

**Files:**
- Create: `src/charts/donut.ts`
- Test: `tests/charts/donut.test.ts`

**Interfaces:**
- Consumes: `round`; `normalizeSeries`, `SeriesAccessors`; `Scene`, `BaseOptions`.
- Produces:
  - `interface DonutGauge { value: number; max: number }`
  - `type DonutInput<T> = DonutGauge | SeriesInput<T>`
  - `interface DonutOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> { thickness?: number; startAngle?: number }`
  - `donut<T>(data: DonutInput<T>, options?: DonutOptions<T>): Scene`
  - internal `ringSegmentPath(cx, cy, rOuter, rInner, startDeg, endDeg): string` (module-local)

**Design:** Square by default (`width = height = 20`). Gauge mode (`{value, max}`) draws a faint full-circle track plus one arc for `value/max`. Segment mode (`{id,label,value}[]`) draws one arc per segment sized by its share of the total, alternating `fill-opacity`. Angles sweep clockwise from `startAngle` (default -90°, i.e. 12 o'clock).

- [ ] **Step 1: Write the failing test `tests/charts/donut.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { donut } from '../../src/charts/donut';

describe('donut (gauge)', () => {
  it('draws a track arc plus a value arc', () => {
    const scene = donut({ value: 75, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2); // track + value
    expect(scene.width).toBe(20);
    expect(scene.height).toBe(20);
  });

  it('summarizes the gauge percentage', () => {
    expect(donut({ value: 75, max: 100 }).a11y.desc).toContain('75');
  });
});

describe('donut (segments)', () => {
  it('draws one arc per segment', () => {
    const scene = donut([{ id: 'a', label: 'A', value: 3 }, { id: 'b', label: 'B', value: 1 }]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    expect(scene.points).toHaveLength(2);
  });
});

describe('donut (edges)', () => {
  it('renders an empty scene for an empty segment list', () => {
    expect(donut([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/charts/donut.test.ts`
Expected: FAIL — cannot find module `../../src/charts/donut`.

- [ ] **Step 3: Write `src/charts/donut.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';

export interface DonutGauge {
  value: number;
  max: number;
}

export type DonutInput<T = number> = DonutGauge | SeriesInput<T>;

export interface DonutOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  thickness?: number;
  startAngle?: number;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function ringSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const [ox1, oy1] = polar(cx, cy, rOuter, startDeg);
  const [ox2, oy2] = polar(cx, cy, rOuter, endDeg);
  const [ix2, iy2] = polar(cx, cy, rInner, endDeg);
  const [ix1, iy1] = polar(cx, cy, rInner, startDeg);
  return (
    `M${round(ox1)},${round(oy1)} ` +
    `A${round(rOuter)},${round(rOuter)} 0 ${large} 1 ${round(ox2)},${round(oy2)} ` +
    `L${round(ix2)},${round(iy2)} ` +
    `A${round(rInner)},${round(rInner)} 0 ${large} 0 ${round(ix1)},${round(iy1)} Z`
  );
}

function isGauge(data: unknown): data is DonutGauge {
  return !Array.isArray(data) && typeof data === 'object' && data !== null && 'max' in data;
}

export function donut<T = number>(data: DonutInput<T>, options: DonutOptions<T> = {}): Scene {
  const width = options.width ?? 20;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const startAngle = options.startAngle ?? -90;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2;
  const thickness = options.thickness ?? rOuter * 0.35;
  const rInner = rOuter - thickness;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  if (isGauge(data)) {
    const frac = data.max === 0 ? 0 : Math.max(0, Math.min(1, data.value / data.max));
    marks.push({
      type: 'path',
      d: ringSegmentPath(cx, cy, rOuter, rInner, startAngle, startAngle + 359.999),
      fill: color,
      fillOpacity: 0.15,
    });
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: ringSegmentPath(cx, cy, rOuter, rInner, startAngle, startAngle + 360 * frac),
        fill: color,
      });
    }
    points.push({
      id: 0,
      label: `${round(frac * 100)}%`,
      value: data.value,
      index: 0,
      x: round(cx),
      y: round(cy),
    });
    return {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      marks,
      points,
      a11y: {
        title: options.title ?? 'donut chart',
        desc: options.desc ?? `donut gauge, ${round(frac * 100)} percent of ${data.max}`,
      },
    };
  }

  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data as SeriesInput<T>, accessors);
  const total = datums.reduce((sum, d) => sum + d.value, 0);
  const base: Scene = {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks,
    points,
    a11y: {
      title: options.title ?? 'donut chart',
      desc:
        options.desc ??
        (datums.length === 0 ? 'donut chart, no data' : `donut chart, ${datums.length} segments`),
    },
  };
  if (datums.length === 0 || total === 0) return base;

  let angle = startAngle;
  datums.forEach((d, i) => {
    const sweep = (d.value / total) * 360;
    marks.push({
      type: 'path',
      d: ringSegmentPath(cx, cy, rOuter, rInner, angle, angle + sweep),
      fill: color,
      fillOpacity: i % 2 === 0 ? 1 : 0.55,
    });
    const [px, py] = polar(cx, cy, (rOuter + rInner) / 2, angle + sweep / 2);
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x: round(px), y: round(py) });
    angle += sweep;
  });

  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/charts/donut.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/charts/donut.ts tests/charts/donut.test.ts
git commit -m "feat: add donut chart (gauge + segments)"
```

---

### Task 14: Color scale + `heatmap` chart

**Files:**
- Create: `src/core/color-scale.ts`, `src/charts/heatmap.ts`
- Test: `tests/core/color-scale.test.ts`, `tests/charts/heatmap.test.ts`

**Interfaces:**
- Produces (color-scale):
  - `parseColor(hex: string): [number, number, number]`
  - `lerpColor(from: string, to: string, t: number): string`
  - `type ColorScale = (value: number, ctx: { min: number; max: number }) => string`
  - `makeColorScale(spec: [string, string] | ColorScale | undefined, domain: [number, number]): ColorScale`
- Produces (heatmap):
  - `interface HeatmapOptions<T> extends BaseOptions { value?: (cell: T, row: number, col: number) => number; colorScale?: [string, string] | ColorScale; gap?: number; radius?: number; cellSize?: number }`
  - `heatmap<T>(matrix: T[][], options?: HeatmapOptions<T>): Scene`

- [ ] **Step 1: Write the failing test `tests/core/color-scale.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseColor, lerpColor, makeColorScale } from '../../src/core/color-scale';

describe('parseColor', () => {
  it('parses #rrggbb', () => {
    expect(parseColor('#ff8800')).toEqual([255, 136, 0]);
  });
  it('parses shorthand #rgb', () => {
    expect(parseColor('#f80')).toEqual([255, 136, 0]);
  });
});

describe('lerpColor', () => {
  it('interpolates midway', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
  });
});

describe('makeColorScale', () => {
  it('maps domain endpoints to the two colors', () => {
    const scale = makeColorScale(['#000000', '#ffffff'], [0, 10]);
    expect(scale(0, { min: 0, max: 10 })).toBe('rgb(0,0,0)');
    expect(scale(10, { min: 0, max: 10 })).toBe('rgb(255,255,255)');
  });
  it('passes a custom function through', () => {
    const scale = makeColorScale(() => 'red', [0, 1]);
    expect(scale(0.5, { min: 0, max: 1 })).toBe('red');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/color-scale.test.ts`
Expected: FAIL — cannot find module `../../src/core/color-scale`.

- [ ] **Step 3: Write `src/core/color-scale.ts`**

```ts
import { linearScale } from './geometry';

export type ColorScale = (value: number, ctx: { min: number; max: number }) => string;

export function parseColor(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]! + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lerpColor(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const c = a.map((av, i) => Math.round(av + (b[i]! - av) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const DEFAULT_SCALE: [string, string] = ['#f0f0f0', '#2563eb'];

export function makeColorScale(
  spec: [string, string] | ColorScale | undefined,
  domain: [number, number],
): ColorScale {
  if (typeof spec === 'function') return spec;
  const [from, to] = spec ?? DEFAULT_SCALE;
  const t = linearScale(domain, [0, 1]);
  return (value) => lerpColor(from, to, Math.max(0, Math.min(1, t(value))));
}
```

- [ ] **Step 4: Run color-scale test to verify it passes**

Run: `pnpm exec vitest run tests/core/color-scale.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test `tests/charts/heatmap.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { heatmap } from '../../src/charts/heatmap';

describe('heatmap', () => {
  it('renders one rect per cell in a grid', () => {
    const scene = heatmap([[1, 4, 2], [3, 0, 5]], { cellSize: 6, gap: 0 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(6);
    // 3 cols x 6 = 18 wide, 2 rows x 6 = 12 tall
    expect(scene.width).toBe(18);
    expect(scene.height).toBe(12);
  });

  it('colors cells via the value scale (min->max)', () => {
    const scene = heatmap([[0, 10]], { cellSize: 6, gap: 0, colorScale: ['#000000', '#ffffff'] });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[0]).toMatchObject({ fill: 'rgb(0,0,0)' });
    expect(rects[1]).toMatchObject({ fill: 'rgb(255,255,255)' });
  });

  it('exposes cell points with row/col', () => {
    const scene = heatmap([[1, 2]], { cellSize: 6, gap: 0 });
    expect(scene.points).toHaveLength(2);
    expect(scene.points[1]).toMatchObject({ row: 0, col: 1, value: 2 });
  });

  it('supports a value accessor for object cells', () => {
    const scene = heatmap([[{ n: 1 }, { n: 9 }]], { value: (c: { n: number }) => c.n, cellSize: 6 });
    expect(scene.points.map((p) => p.value)).toEqual([1, 9]);
  });

  it('renders an empty scene for empty data', () => {
    expect(heatmap([]).marks).toEqual([]);
  });
});
```

- [ ] **Step 6: Run heatmap test to verify it fails**

Run: `pnpm exec vitest run tests/charts/heatmap.test.ts`
Expected: FAIL — cannot find module `../../src/charts/heatmap`.

- [ ] **Step 7: Write `src/charts/heatmap.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { makeColorScale, type ColorScale } from '../core/color-scale';

export interface HeatmapOptions<T = number> extends BaseOptions {
  value?: (cell: T, row: number, col: number) => number;
  colorScale?: [string, string] | ColorScale;
  gap?: number;
  radius?: number;
  cellSize?: number;
}

export function heatmap<T = number>(matrix: T[][], options: HeatmapOptions<T> = {}): Scene {
  const cell = options.cellSize ?? 8;
  const gap = options.gap ?? 1;
  const getValue = options.value ?? ((c: T) => c as unknown as number);

  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0]!.length : 0;
  const width = cols * cell;
  const height = rows * cell;

  const flat: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) flat.push(getValue(matrix[r]![c]!, r, c));
  }

  const base: Scene = {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks: [],
    points: [],
    a11y: {
      title: options.title ?? 'heatmap',
      desc: options.desc ?? (flat.length === 0 ? 'heatmap, no data' : `heatmap, ${rows} by ${cols} cells`),
    },
  };
  if (flat.length === 0) return base;

  const domain = extent(flat);
  const scale = makeColorScale(options.colorScale, domain);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const value = flat[i++]!;
      const x = round(c * cell + gap / 2);
      const y = round(r * cell + gap / 2);
      const size = round(cell - gap);
      marks.push({
        type: 'rect',
        x,
        y,
        width: size,
        height: size,
        fill: scale(value, { min: domain[0], max: domain[1] }),
        rx: options.radius,
      });
      points.push({ id: `${r}-${c}`, label: String(value), value, index: r * cols + c, row: r, col: c, x, y, w: size, h: size });
    }
  }
  return { ...base, marks, points };
}
```

- [ ] **Step 8: Run heatmap test to verify it passes**

Run: `pnpm exec vitest run tests/charts/heatmap.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/core/color-scale.ts src/charts/heatmap.ts tests/core/color-scale.test.ts tests/charts/heatmap.test.ts
git commit -m "feat: add color scale and heatmap chart"
```

---

### Task 15: Public barrel, subpath exports & bundle-size budget

**Files:**
- Modify: `src/index.ts` (replace smoke export), `tsup.config.ts`, `package.json`
- Create: `.size-limit.json`
- Delete: `tests/smoke.test.ts` (replaced by a real barrel test)
- Create: `tests/index.test.ts`

**Interfaces:**
- Consumes: every chart function + `toSVG`.
- Produces: the public package surface (barrel + per-chart subpaths), enforced size budget.

- [ ] **Step 1: Replace `src/index.ts` with the real barrel**

```ts
export { line, type LineOptions } from './charts/line';
export { area, type AreaOptions } from './charts/area';
export { bar, type BarOptions, type BarInput } from './charts/bar';
export { winLoss, type WinLossOptions } from './charts/win-loss';
export { bullet, type BulletData, type BulletOptions } from './charts/bullet';
export { donut, type DonutOptions, type DonutGauge, type DonutInput } from './charts/donut';
export { scatter, type ScatterOptions, type ScatterPoint, type ScatterInput } from './charts/scatter';
export { heatmap, type HeatmapOptions } from './charts/heatmap';
export { toSVG } from './render/to-svg';
export type { Scene, Mark, ScenePoint, BaseOptions, Datum } from './types';
export type { ColorScale } from './core/color-scale';
```

- [ ] **Step 2: Delete the smoke test and write `tests/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import * as api from '../src/index';
import { toSVG, line, bar, donut, heatmap } from '../src/index';

describe('public API', () => {
  it('exports all eight charts plus toSVG', () => {
    for (const name of ['line', 'area', 'bar', 'winLoss', 'bullet', 'donut', 'scatter', 'heatmap', 'toSVG']) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('charts compose with toSVG into valid svg strings', () => {
    expect(toSVG(line([1, 2, 3])).startsWith('<svg ')).toBe(true);
    expect(toSVG(bar([[1, 2], [3, 4]]))).toContain('<rect');
    expect(toSVG(donut({ value: 3, max: 4 }))).toContain('<path');
    expect(toSVG(heatmap([[1, 2]]))).toContain('<rect');
  });

  it('is deterministic end to end', () => {
    expect(toSVG(line([3, 1, 4, 1, 5]))).toBe(toSVG(line([3, 1, 4, 1, 5])));
  });
});
```

Delete: `rm tests/smoke.test.ts`

- [ ] **Step 3: Update `tsup.config.ts` for per-chart entries (subpath tree-shaking)**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    line: 'src/charts/line.ts',
    area: 'src/charts/area.ts',
    bar: 'src/charts/bar.ts',
    'win-loss': 'src/charts/win-loss.ts',
    bullet: 'src/charts/bullet.ts',
    donut: 'src/charts/donut.ts',
    scatter: 'src/charts/scatter.ts',
    heatmap: 'src/charts/heatmap.ts',
    'to-svg': 'src/render/to-svg.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  outDir: 'dist',
});
```

- [ ] **Step 4: Add the `exports` map and size script to `package.json`**

Add these keys to `package.json` (alongside existing ones):

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./line": { "types": "./dist/line.d.ts", "import": "./dist/line.js", "require": "./dist/line.cjs" },
    "./area": { "types": "./dist/area.d.ts", "import": "./dist/area.js", "require": "./dist/area.cjs" },
    "./bar": { "types": "./dist/bar.d.ts", "import": "./dist/bar.js", "require": "./dist/bar.cjs" },
    "./win-loss": { "types": "./dist/win-loss.d.ts", "import": "./dist/win-loss.js", "require": "./dist/win-loss.cjs" },
    "./bullet": { "types": "./dist/bullet.d.ts", "import": "./dist/bullet.js", "require": "./dist/bullet.cjs" },
    "./donut": { "types": "./dist/donut.d.ts", "import": "./dist/donut.js", "require": "./dist/donut.cjs" },
    "./scatter": { "types": "./dist/scatter.d.ts", "import": "./dist/scatter.js", "require": "./dist/scatter.cjs" },
    "./heatmap": { "types": "./dist/heatmap.d.ts", "import": "./dist/heatmap.js", "require": "./dist/heatmap.cjs" },
    "./to-svg": { "types": "./dist/to-svg.d.ts", "import": "./dist/to-svg.js", "require": "./dist/to-svg.cjs" }
  }
}
```

- [ ] **Step 5: Create `.size-limit.json`** (per-chart budget; line imported alone must stay tiny)

```json
[
  { "name": "line (standalone)", "path": "dist/line.js", "import": "{ line }", "limit": "1.5 kB" },
  { "name": "toSVG (standalone)", "path": "dist/to-svg.js", "import": "{ toSVG }", "limit": "1 kB" },
  { "name": "full barrel", "path": "dist/index.js", "limit": "6 kB" }
]
```

- [ ] **Step 6: Build, test, and check size**

Run: `pnpm build && pnpm test && pnpm size`
Expected: build emits all entries in `dist/`; all tests pass; size-limit reports each entry under budget.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire public barrel, subpath exports, and size budget"
```

---

### Task 16: README, CI, and release configuration

**Files:**
- Create: `README.md`, `LICENSE`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.changeset/config.json`
- Modify: `package.json` (add `@changesets/cli` devDependency, `repository`/`homepage` fields)

**Interfaces:**
- Consumes: the finished public API.
- Produces: docs + green CI + automated publish-on-merge.

- [ ] **Step 1: Write `README.md`** (include real, copy-pasteable usage and a rendered example)

````markdown
# @samirdamle/nano-charts

Extremely lightweight, zero-dependency TypeScript library for **tiny SVG charts** —
sparklines, micro bars, donuts, bullets, scatter, and heatmaps — the kind you repeat
hundreds of times across table cells and metric cards.

- Zero runtime dependencies, tree-shakeable (import one chart, ship ~1 kB).
- Framework-agnostic **scene model** core (`data → Scene`) + a `toSVG` serializer.
- SSR-safe & deterministic. Inherits text color via `currentColor`. Accessible by default.

## Install

```sh
npm i @samirdamle/nano-charts
```

## Usage

```ts
import { line, toSVG } from '@samirdamle/nano-charts';

const scene = line([4, 9, 2, 7, 5]);
const svg = toSVG(scene); // '<svg …>…</svg>' — drop into any HTML

// Import just one chart for the smallest bundle:
import { bar } from '@samirdamle/nano-charts/bar';
```

Every chart is `(data, options?) => Scene`. `scene.points` exposes each data point's
computed `{ id, label, value, x, y }` so UI wrappers can attach hover/click handlers.

## Charts

| Function | Encodes | Data |
|----------|---------|------|
| `line` / `area` | trend | `number[]`, `{id,label,value}[]`, or accessors |
| `bar` | magnitude (simple or **stacked**) | series, or nested arrays for stacks |
| `winLoss` | direction/sign | series |
| `bullet` | value vs target | `{ value, target, ranges? }` |
| `donut` | proportion | `{ value, max }` (gauge) or segments |
| `scatter` | 2D relationship | `[x,y][]`, `{x,y}[]`, or accessors |
| `heatmap` | intensity grid | `number[][]` (+ `colorScale`) |

## License

MIT © Samir Damle
````

- [ ] **Step 2: Write `LICENSE`** (MIT, copyright `2026 Samir Damle`). Use the standard MIT text.

- [ ] **Step 3: Add `@changesets/cli` and metadata to `package.json`**

Add to `devDependencies`: `"@changesets/cli": "^2.27.7"`. Add top-level fields:

```json
{
  "repository": { "type": "git", "url": "git+https://github.com/samirdamle/nano-charts.git" },
  "homepage": "https://github.com/samirdamle/nano-charts#readme",
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 4: Initialize Changesets config `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 5: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: {}
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm size
```

- [ ] **Step 6: Write `.github/workflows/release.yml`**

```yaml
name: Release
on:
  push: { branches: [main] }
permissions: { contents: write, pull-requests: write }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with: { publish: pnpm exec changeset publish }
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 7: Verify everything green locally**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm size`
Expected: all steps succeed.

- [ ] **Step 8: Add an initial changeset and commit**

Run: `pnpm exec changeset` — choose a `minor` bump for `@samirdamle/nano-charts`, summary "Initial release: 8 tiny SVG charts with scene-model core."

```bash
git add -A
git commit -m "docs: add README, license, CI, and release configuration"
```

---

## Self-Review

**1. Spec coverage:**
- Scene-model core (`data → Scene`) → Tasks 2, 6, 7–14. ✓
- 8 charts (line, area, bar+stacking, winLoss, bullet, donut gauge+segments, scatter, heatmap) → Tasks 7–14. ✓
- Three-form normalization + bar nested arrays + scatter 2D + donut gauge/segments → Tasks 3, 9, 11, 13. ✓
- `scene.points` for interactivity → asserted in every chart task. ✓
- `currentColor` default → Task 6 (svg root) + every chart. ✓
- `viewBox` scaling, no fixed size → Task 6. ✓
- a11y role/title/desc + summaries → Tasks 5, 6. ✓
- Color scale (heatmap) → Task 14. ✓
- Determinism/SSR (rounding, no DOM/random) → `round` in Task 2, determinism tests in Tasks 6 & 15. ✓
- Package: dual ESM+CJS, subpaths, `sideEffects:false`, tree-shakeable, size budget → Tasks 1, 15. ✓
- Tooling: pnpm, tsup, Vitest, ESLint+Prettier, size-limit, Changesets, MIT, Node>=18 → Tasks 1, 15, 16. ✓
- Library-only (no demo site) → respected; not in scope. ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" placeholders — every code step contains full code and every test step contains concrete assertions. ✓ (LICENSE in Task 16 references "standard MIT text," which is a fixed, well-known document, not an ambiguous placeholder.)

**3. Type consistency:** `Scene`/`Mark`/`ScenePoint`/`BaseOptions`/`Datum` defined in Task 2 and used unchanged throughout. `normalizeSeries`/`SeriesAccessors`/`SeriesInput` defined in Task 3, consumed identically in Tasks 7–10, 13. `seriesLayout`/`resolvePadding` signatures from Task 4 match all callers. `toSVG` signature from Task 6 matches Task 15 usage. `makeColorScale`/`ColorScale` from Task 14 match heatmap usage. Chart function names match the barrel exports in Task 15. ✓
