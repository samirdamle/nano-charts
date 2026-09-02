# Line Chart Demo Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable line styling (dash pattern, line cap, dot radius), a multi-series overlay chart function (`lines()`), inert hit-testing data attributes on rendered dots, and two new demo gallery cards (a static multi-series example, and an interactive hover/click example) — plus two small demo cleanups (drop group chart-counts, drop the "Fixed" badge from the Line group's single-point card).

**Architecture:** Core additions follow the existing `(data, options) => Scene` / `Scene → toSVG() string` pipeline exactly — `line()` gets new optional options that flow into existing `Mark` fields, and a new sibling function `lines()` reuses the same `normalizeSeries`/`seriesLayout`/`extent` building blocks to overlay several series on one shared scale. `toSVG` gains rendering support for the new `Mark` fields. No event listeners are added anywhere in `src/` — the interactive demo card wires up plain `pointermove`/`click` listeners itself, reading the new `data-index` attribute that `toSVG` now emits on dot circles.

**Tech Stack:** TypeScript, Vitest, tsup, vanilla JS/HTML (demo only). No new runtime dependencies.

## Global Constraints

- Zero new runtime dependencies (`package.json` `dependencies` stays `{}`).
- Every new field on `Mark`, `ScenePoint`, `LineOptions` is optional — existing `line()` calls, `toSVG()` calls, and any code matching on `Mark`/`ScenePoint` shapes must keep working unchanged.
- No event listeners, DOM APIs, or other interactivity inside `src/` — `toSVG` only ever emits inert `data-*` attributes; all listener wiring lives in `demo/index.html`.
- `strokeDasharray` accepts a raw SVG dasharray string or a `number[]` (space-joined) — no boolean sugar, no named presets.
- Don't touch the Area or Heatmap groups' existing `fixed` badges, and don't add `strokeDasharray`/`dotRadius`/hit-testing attributes to any chart type other than `line`/`lines`.

---

### Task 1: Demo cleanup — drop group chart-counts and the Line single-point "Fixed" badge

**Files:**
- Modify: `demo/index.html`

**Interfaces:** None — this task touches only demo markup/JS, no library code.

- [ ] **Step 1: Remove the count badge from `group()`**

In `demo/index.html`, inside the `<script type="module">` block, find the `group()` function. Remove the `count` element entirely:

```js
// Before:
const heading = document.createElement('div');
heading.className = 'group-heading';
const h2 = document.createElement('h2');
h2.textContent = title;
const count = document.createElement('span');
count.className = 'count';
count.textContent = entries.length;
heading.append(h2, count);

// After:
const heading = document.createElement('div');
heading.className = 'group-heading';
const h2 = document.createElement('h2');
h2.textContent = title;
heading.append(h2);
```

- [ ] **Step 2: Remove the now-dead `.count` CSS rule**

In the `<style>` block, delete this rule (it styled the element removed in Step 1):

```css
  .group-heading .count {
    font-size: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
```

- [ ] **Step 3: Drop `fixed: true` from the Line group's single-point card**

Find this line in the `group('Line', [...])` call:

```js
{ title: 'Single point — renders as a dot', scene: line([5]), fixed: true },
```

Change it to:

```js
{ title: 'Single point — renders as a dot', scene: line([5]) },
```

Leave the Area group's `{ title: 'Single point — renders as a dot', scene: area([5]), fixed: true }` and the Heatmap group's `{ title: 'Ragged rows — no longer throws', ..., fixed: true }` entries untouched.

- [ ] **Step 4: Verify in a browser**

```bash
pnpm build
python3 -m http.server 8123 &
```

Open `http://localhost:8123/demo/index.html`. Confirm:
- No group heading shows a number next to its title (e.g. "LINE" not "LINE 3").
- The Line group's "Single point — renders as a dot" card has no "Fixed" badge.
- The Area group's single-point card and the Heatmap group's ragged-rows card **still** show their "Fixed" badges.

Stop the server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add demo/index.html
git commit -m "$(cat <<'EOF'
chore(demo): drop group chart-counts and the line single-point fixed badge

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `toSVG` renders line style and hit-testing attributes

**Files:**
- Modify: `src/types.ts`
- Modify: `src/render/to-svg.ts`
- Test: `tests/render/to-svg.test.ts`

**Interfaces:**
- Produces: `Mark`'s `polyline` variant gains `strokeDasharray?: string` and `strokeLinecap?: 'butt' | 'round' | 'square'`. `Mark`'s `circle` variant gains `index?: number` and `seriesIndex?: number`. `toSVG` renders these as `stroke-dasharray`, `stroke-linecap`, `data-index`, `data-series` attributes (omitted when `undefined`, via the existing `attr()` helper). Tasks 3 and 4 rely on these `Mark` fields existing.

- [ ] **Step 1: Write the failing tests**

Add to `tests/render/to-svg.test.ts` (inside the existing `describe('toSVG', ...)` block, after the last `it`):

```ts
  it('serializes stroke-dasharray and stroke-linecap on a polyline', () => {
    const svg = toSVG({
      ...scene,
      marks: [
        {
          type: 'polyline',
          points: [[0, 0], [10, 10]],
          strokeDasharray: '4 2',
          strokeLinecap: 'round',
        },
      ],
    });
    expect(svg).toContain('stroke-dasharray="4 2"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('serializes data-index and data-series on a circle', () => {
    const svg = toSVG({
      ...scene,
      marks: [{ type: 'circle', cx: 5, cy: 5, r: 2, index: 3, seriesIndex: 1 }],
    });
    expect(svg).toContain('data-index="3"');
    expect(svg).toContain('data-series="1"');
  });

  it('omits stroke-dasharray/stroke-linecap/data-index/data-series when not set', () => {
    const svg = toSVG(scene);
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg).not.toContain('stroke-linecap');
    expect(svg).not.toContain('data-index');
    expect(svg).not.toContain('data-series');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/render/to-svg.test.ts`
Expected: 3 new FAILs — TypeScript will also complain that `strokeDasharray`, `strokeLinecap`, `index`, `seriesIndex` don't exist on the `Mark` variants yet (vitest will still run against the compiled/transpiled output, but the type errors confirm the fields are missing).

- [ ] **Step 3: Add the fields to `Mark` in `src/types.ts`**

```ts
export type Mark =
  | {
      type: 'polyline';
      points: [number, number][];
      stroke?: string;
      strokeWidth?: number;
      fill?: 'none';
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
    }
  | { type: 'path'; d: string; fill?: string; fillOpacity?: number; stroke?: string; strokeWidth?: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill?: string; fillOpacity?: number; rx?: number }
  | {
      type: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      index?: number;
      seriesIndex?: number;
    }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number };
```

- [ ] **Step 4: Render the new attributes in `src/render/to-svg.ts`**

```ts
function renderMark(m: Mark): string {
  switch (m.type) {
    case 'polyline': {
      const pts = m.points.map(([x, y]) => `${x},${y}`).join(' ');
      return `<polyline points="${esc(pts)}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('stroke-dasharray', m.strokeDasharray)}${attr('stroke-linecap', m.strokeLinecap)}/>`;
    }
    case 'path':
      return `<path d="${esc(m.d)}"${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'rect':
      return `<rect${attr('x', m.x)}${attr('y', m.y)}${attr('width', m.width)}${attr('height', m.height)}${attr('rx', m.rx)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}/>`;
    case 'circle':
      return `<circle${attr('cx', m.cx)}${attr('cy', m.cy)}${attr('r', m.r)}${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('data-index', m.index)}${attr('data-series', m.seriesIndex)}/>`;
    case 'line':
      return `<line${attr('x1', m.x1)}${attr('y1', m.y1)}${attr('x2', m.x2)}${attr('y2', m.y2)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
  }
}
```

(Only the `polyline` and `circle` cases change; `path`, `rect`, `line` are shown for context/copy-paste accuracy, unchanged.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/render/to-svg.test.ts`
Expected: all PASS (the 3 new tests plus the existing ones in this file).

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/render/to-svg.ts tests/render/to-svg.test.ts
git commit -m "$(cat <<'EOF'
feat: render line style and hit-testing attributes in toSVG

Mark gains optional strokeDasharray/strokeLinecap (polyline) and
index/seriesIndex (circle) fields; toSVG renders them as
stroke-dasharray, stroke-linecap, data-index, data-series. All
optional and inert — no event wiring added to the core.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `line()` gains `strokeDasharray`, `strokeLinecap`, `dotRadius`

**Files:**
- Modify: `src/charts/line.ts`
- Test: `tests/charts/line.test.ts`

**Interfaces:**
- Consumes: `Mark`'s `polyline.strokeDasharray`/`strokeLinecap` and `circle.index` fields from Task 2.
- Produces: `LineOptions` gains `strokeDasharray?: string | number[]`, `strokeLinecap?: 'butt' | 'round' | 'square'`, `dotRadius?: number` (default `1`). Every dot circle `line()` emits now carries `index` equal to that point's position in the returned `points` array. Task 5 (demo) relies on `dotRadius` and the emitted `index`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/charts/line.test.ts` (inside `describe('line', ...)`, after the last `it`):

```ts
  it('applies strokeDasharray (array form) and strokeLinecap to the polyline', () => {
    const scene = line([0, 10, 5], { strokeDasharray: [4, 2], strokeLinecap: 'round' });
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(poly).toMatchObject({ strokeDasharray: '4 2', strokeLinecap: 'round' });
  });

  it('passes a raw string strokeDasharray through unchanged', () => {
    const scene = line([0, 10, 5], { strokeDasharray: '4 2 1' });
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(poly).toMatchObject({ strokeDasharray: '4 2 1' });
  });

  it('uses dotRadius for dot circles', () => {
    const scene = line([0, 10, 5], { dot: 'all', dotRadius: 3 });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles.every((c) => c.r === 3)).toBe(true);
  });

  it('tags each dot circle with its point index', () => {
    const scene = line([0, 10, 5], { dot: 'all' });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('uses dotRadius for the single-point fallback dot', () => {
    const scene = line([5], { dotRadius: 4 });
    const circle = scene.marks.find((m) => m.type === 'circle');
    expect(circle).toMatchObject({ r: 4, index: 0 });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/charts/line.test.ts`
Expected: 5 new FAILs (`strokeDasharray`/`dotRadius` aren't recognized options yet; circles have no `index`).

- [ ] **Step 3: Implement in `src/charts/line.ts`**

Replace the full file with:

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
  dotRadius?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
}

function toDasharray(d: string | number[] | undefined): string | undefined {
  return Array.isArray(d) ? d.join(' ') : d;
}

export function line<T = number>(data: SeriesInput<T>, options: LineOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const strokeWidth = options.strokeWidth ?? 1;
  const dotRadius = options.dotRadius ?? 1;
  const strokeDasharray = toDasharray(options.strokeDasharray);
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('line', datums);
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

  const marks: Mark[] = [];

  if (points.length >= 2) {
    marks.push({
      type: 'polyline',
      points: points.map((p) => [p.x, p.y] as [number, number]),
      fill: 'none',
      stroke: color,
      strokeWidth,
      ...(strokeDasharray !== undefined ? { strokeDasharray } : {}),
      ...(options.strokeLinecap !== undefined ? { strokeLinecap: options.strokeLinecap } : {}),
    });
    if (options.dot && options.dot !== 'none') {
      const dottedIndices = options.dot === 'last' ? [points.length - 1] : points.map((_, i) => i);
      for (const i of dottedIndices) {
        const p = points[i]!;
        marks.push({ type: 'circle', cx: p.x, cy: p.y, r: dotRadius, fill: color, index: i });
      }
    }
  } else {
    // A single point has no line to draw; render it as a dot so it's visible.
    const p = points[0]!;
    marks.push({
      type: 'circle',
      cx: p.x,
      cy: p.y,
      r: Math.max(dotRadius, strokeWidth + 0.5),
      fill: color,
      index: 0,
    });
  }

  return { ...base, marks, points };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/charts/line.test.ts`
Expected: all PASS, including the 7 pre-existing tests (the exact-`toEqual` polyline test still matches since `strokeDasharray`/`strokeLinecap` are only spread in when defined; the `dot: 'last'` test still matches via `toMatchObject`).

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/charts/line.ts tests/charts/line.test.ts
git commit -m "$(cat <<'EOF'
feat: add strokeDasharray, strokeLinecap and dotRadius to line()

Exposes the raw SVG dash/linecap primitives (no boolean sugar or
named presets) and a configurable dot radius. Dot circles now carry
their point index for hit-testing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: New `lines()` multi-series overlay export

**Files:**
- Modify: `src/types.ts` (add `ScenePoint.seriesIndex`/`seriesLabel`)
- Create: `src/charts/lines.ts`
- Test: `tests/charts/lines.test.ts`
- Modify: `src/index.ts` (export `lines`)
- Modify: `tsup.config.ts` (add build entry)
- Modify: `package.json` (add `./lines` subpath export)

**Interfaces:**
- Consumes: `Mark.circle.index`/`seriesIndex` and `Mark.polyline.strokeDasharray`/`strokeLinecap` from Task 2; `resolvePadding`/`seriesLayout` from `src/core/plot.ts`; `extent`/`round` from `src/core/geometry.ts`; `normalizeSeries`/`SeriesAccessors`/`SeriesInput` from `src/core/normalize.ts`.
- Produces: `export function lines<T = number>(series: LineSeries<T>[], options?: LinesOptions): Scene`, `export interface LineSeries<T = number>`, `export type LinesOptions = BaseOptions`. Task 6 (demo "Multiple series" card) calls `lines()` directly.

- [ ] **Step 1: Add `seriesIndex`/`seriesLabel` to `ScenePoint` in `src/types.ts`**

```ts
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
  seriesIndex?: number;
  seriesLabel?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/charts/lines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lines } from '../../src/charts/lines';

describe('lines', () => {
  it('overlays multiple series on one shared y-scale', () => {
    const scene = lines([{ data: [0, 10] }, { data: [5, 5] }]);
    const polylines = scene.marks.filter((m) => m.type === 'polyline');
    expect(polylines).toHaveLength(2);
    expect(polylines[0]).toMatchObject({
      points: [
        [1, 19],
        [99, 1],
      ],
    });
    expect(polylines[1]).toMatchObject({
      points: [
        [1, 10],
        [99, 10],
      ],
    });
  });

  it('applies per-series color, strokeWidth, strokeDasharray and strokeLinecap', () => {
    const scene = lines([
      { data: [0, 10], color: 'red', strokeWidth: 2.5 },
      { data: [0, 10], color: 'blue', strokeDasharray: [3, 2], strokeLinecap: 'round' },
    ]);
    const [a, b] = scene.marks.filter((m) => m.type === 'polyline');
    expect(a).toMatchObject({ stroke: 'red', strokeWidth: 2.5 });
    expect(b).toMatchObject({ stroke: 'blue', strokeDasharray: '3 2', strokeLinecap: 'round' });
  });

  it('tags points with seriesIndex and seriesLabel', () => {
    const scene = lines([
      { data: [1, 2], name: 'Actual' },
      { data: [3, 4], name: 'Target' },
    ]);
    expect(scene.points.map((p) => [p.seriesIndex, p.seriesLabel])).toEqual([
      [0, 'Actual'],
      [0, 'Actual'],
      [1, 'Target'],
      [1, 'Target'],
    ]);
  });

  it('tags dot circles with a global point index and seriesIndex', () => {
    const scene = lines([
      { data: [1, 2], dot: 'all' },
      { data: [3, 4], dot: 'all' },
    ]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles.map((c) => [c.index, c.seriesIndex])).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]);
  });

  it('renders an empty scene when there are no series', () => {
    const scene = lines([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
  });

  it('renders a lone point in a series as a dot', () => {
    const scene = lines([{ data: [5] }, { data: [1, 9] }]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ seriesIndex: 0 });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run tests/charts/lines.test.ts`
Expected: FAIL — `src/charts/lines.ts` doesn't exist yet (`Cannot find module '../../src/charts/lines'`).

- [ ] **Step 4: Create `src/charts/lines.ts`**

```ts
import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';

export interface LineSeries<T = number> extends Partial<SeriesAccessors<T>> {
  data: SeriesInput<T>;
  /** Series display name, carried onto its points as `seriesLabel`. */
  name?: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  dot?: 'none' | 'last' | 'all';
  dotRadius?: number;
}

export type LinesOptions = BaseOptions;

function toDasharray(d: string | number[] | undefined): string | undefined {
  return Array.isArray(d) ? d.join(' ') : d;
}

export function lines<T = number>(series: LineSeries<T>[], options: LinesOptions = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const defaultColor = options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);

  const perSeries = series.map((s) => {
    const accessors = s.value ? { value: s.value, label: s.label, id: s.id } : undefined;
    return { input: s, datums: normalizeSeries(s.data, accessors) };
  });

  const count = perSeries.length ? Math.max(...perSeries.map((s) => s.datums.length)) : 0;
  const title = options.title ?? 'line chart';
  const desc = options.desc ?? `${title}, ${perSeries.length} series, up to ${count} points`;
  const a11y = { title, desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };

  const allValues = perSeries.flatMap((s) => s.datums.map((d) => d.value));
  if (allValues.length === 0) return base;

  const layout = seriesLayout(count, extent(allValues), { width, height, padding });

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  perSeries.forEach(({ input, datums }, seriesIndex) => {
    const color = input.color ?? defaultColor;
    const strokeWidth = input.strokeWidth ?? 1;
    const dotRadius = input.dotRadius ?? 1;
    const strokeDasharray = toDasharray(input.strokeDasharray);

    const seriesPoints: ScenePoint[] = datums.map((d) => ({
      id: d.id,
      label: d.label,
      value: d.value,
      index: d.index,
      x: round(layout.x(d.index)),
      y: round(layout.y(d.value)),
      seriesIndex,
      ...(input.name !== undefined ? { seriesLabel: input.name } : {}),
    }));

    if (seriesPoints.length >= 2) {
      marks.push({
        type: 'polyline',
        points: seriesPoints.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
        ...(strokeDasharray !== undefined ? { strokeDasharray } : {}),
        ...(input.strokeLinecap !== undefined ? { strokeLinecap: input.strokeLinecap } : {}),
      });
      if (input.dot && input.dot !== 'none') {
        const dottedIndices =
          input.dot === 'last' ? [seriesPoints.length - 1] : seriesPoints.map((_, i) => i);
        for (const i of dottedIndices) {
          const p = seriesPoints[i]!;
          marks.push({
            type: 'circle',
            cx: p.x,
            cy: p.y,
            r: dotRadius,
            fill: color,
            index: points.length + i,
            seriesIndex,
          });
        }
      }
    } else if (seriesPoints.length === 1) {
      // A lone point in a series has no line to draw; render it as a dot so it's visible.
      const p = seriesPoints[0]!;
      marks.push({
        type: 'circle',
        cx: p.x,
        cy: p.y,
        r: Math.max(dotRadius, strokeWidth + 0.5),
        fill: color,
        index: points.length,
        seriesIndex,
      });
    }

    points.push(...seriesPoints);
  });

  return { ...base, marks, points };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/charts/lines.test.ts`
Expected: all 6 PASS.

- [ ] **Step 6: Export `lines` from the package barrel**

In `src/index.ts`, add this line after the `line` export:

```ts
export { lines, type LineSeries, type LinesOptions } from './charts/lines';
```

- [ ] **Step 7: Add the `lines` build entry to `tsup.config.ts`**

In `tsup.config.ts`, add `lines: 'src/charts/lines.ts',` right after `line: 'src/charts/line.ts',`:

```ts
  entry: {
    index: 'src/index.ts',
    line: 'src/charts/line.ts',
    lines: 'src/charts/lines.ts',
    area: 'src/charts/area.ts',
    bar: 'src/charts/bar.ts',
    'win-loss': 'src/charts/win-loss.ts',
    bullet: 'src/charts/bullet.ts',
    donut: 'src/charts/donut.ts',
    scatter: 'src/charts/scatter.ts',
    heatmap: 'src/charts/heatmap.ts',
    'to-svg': 'src/render/to-svg.ts',
  },
```

- [ ] **Step 8: Add the `./lines` subpath export to `package.json`**

In `package.json`, add this entry to `"exports"` right after `"./line"`:

```json
    "./lines": { "types": "./dist/lines.d.ts", "import": "./dist/lines.js", "require": "./dist/lines.cjs" },
```

- [ ] **Step 9: Run the full test suite, typecheck, and build**

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all PASS, no type errors, build succeeds and produces `dist/lines.js`, `dist/lines.cjs`, `dist/lines.d.ts`.

- [ ] **Step 10: Commit**

```bash
git add src/types.ts src/charts/lines.ts tests/charts/lines.test.ts src/index.ts tsup.config.ts package.json
git commit -m "$(cat <<'EOF'
feat: add lines() for overlaying multiple series on one shared scale

New sibling to line() that takes an array of series (each with its
own color/strokeWidth/dash/dot styling) and lays them out on one
combined y-domain and shared index-based x-scale. Points carry
seriesIndex/seriesLabel so multi-series scenes remain attributable.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Demo — "Multiple series" card

**Files:**
- Modify: `demo/index.html`

**Interfaces:**
- Consumes: `lines()` from Task 4.

- [ ] **Step 1: Add series color CSS variables**

In `demo/index.html`'s `:root` block (after `--new-badge-text: #3a5dae;`), add:

```css
    --series-2: #3f9d76;
    --series-3: #b8555f;
```

In the `@media (prefers-color-scheme: dark)` block's `:root` (after `--new-badge-text: #8ea6e0;`), add:

```css
      --series-2: #7cc9a7;
      --series-3: #e08a91;
```

- [ ] **Step 2: Import `lines` in the demo script**

Change the import line:

```js
import { line, area, bar, winLoss, bullet, donut, scatter, heatmap, toSVG } from '../dist/index.js';
```

to:

```js
import { line, lines, area, bar, winLoss, bullet, donut, scatter, heatmap, toSVG } from '../dist/index.js';
```

- [ ] **Step 3: Add the card**

In the `group('Line', [...])` call, add a new entry after the single-point card:

```js
  group('Line', [
    { title: 'Basic', scene: line([3, 7, 2, 9, 5, 6]) },
    { title: 'With dots', scene: line([3, 7, 2, 9, 5, 6], { dot: 'all' }) },
    { title: 'Single point — renders as a dot', scene: line([5]) },
    {
      title: 'Multiple series',
      scene: lines([
        { data: [3, 7, 2, 9, 5, 6], name: 'Revenue', color: 'var(--accent)' },
        { data: [4, 4, 5, 6, 6, 7], name: 'Target', color: 'var(--series-2)', strokeDasharray: [3, 2] },
        { data: [2, 5, 6, 5, 8, 9], name: 'Forecast', color: 'var(--series-3)', strokeWidth: 2.5 },
      ]),
    },
  ]);
```

- [ ] **Step 4: Verify in a browser**

```bash
pnpm build
python3 -m http.server 8123 &
```

Open `http://localhost:8123/demo/index.html`. In the Line group, confirm the new "Multiple series" card shows three distinctly colored lines sharing one vertical scale: a solid accent-colored line, a dashed second-colored line, and a visibly thicker third-colored solid line.

Stop the server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add demo/index.html
git commit -m "$(cat <<'EOF'
feat(demo): add multi-series line card (solid, dashed, thick)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Demo — "Hover & click" interactive card

**Files:**
- Modify: `demo/index.html`

**Interfaces:**
- Consumes: `line()`'s `dotRadius` option and `data-index`-tagged dot circles (Tasks 2–3).

- [ ] **Step 1: Add `.chart-info` CSS**

In the `<style>` block, after the `.chart svg { ... }` rule, add:

```css
  .chart-info {
    font-size: 12px;
    color: var(--text-muted);
    min-height: 16px;
    font-variant-numeric: tabular-nums;
  }
```

- [ ] **Step 2: Add `interactive` support to `group()`**

Replace the body of the `for (const { title: cardTitle, scene, fixed } of entries)` loop in `group()` with (note the destructured entry now also pulls `interactive`):

```js
    for (const { title: cardTitle, scene, fixed, interactive } of entries) {
      const card = document.createElement('div');
      card.className = 'card';

      const head = document.createElement('div');
      head.className = 'card-head';
      const h3 = document.createElement('h3');
      h3.textContent = cardTitle;
      head.append(h3);
      if (fixed) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Fixed';
        head.append(badge);
      }

      const chart = document.createElement('div');
      chart.className = 'chart';
      chart.innerHTML = toSVG(scene);

      card.append(head, chart);

      if (interactive) {
        const info = document.createElement('div');
        info.className = 'chart-info';
        const idleText = 'Hover or click a point';
        info.textContent = idleText;

        let selectedText = null;
        const describePoint = (indexAttr) => {
          const point = scene.points[Number(indexAttr)];
          return point ? `index ${point.index} — value ${point.value}` : null;
        };

        chart.addEventListener('pointermove', (event) => {
          const indexAttr = event.target?.dataset?.index;
          if (indexAttr === undefined) return;
          const desc = describePoint(indexAttr);
          if (desc) info.textContent = `Hovering: ${desc}`;
        });

        chart.addEventListener('pointerleave', () => {
          info.textContent = selectedText ?? idleText;
        });

        chart.addEventListener('click', (event) => {
          const indexAttr = event.target?.dataset?.index;
          if (indexAttr === undefined) return;
          const desc = describePoint(indexAttr);
          if (desc) {
            selectedText = `Selected: ${desc}`;
            info.textContent = selectedText;
          }
        });

        card.append(info);
      }

      grid.append(card);
    }
```

- [ ] **Step 3: Add the card**

In the `group('Line', [...])` call, add a new entry after the "Multiple series" card added in Task 5:

```js
    {
      title: 'Hover & click',
      scene: line([3, 7, 2, 9, 5, 6], { dot: 'all', dotRadius: 2.5 }),
      interactive: true,
    },
```

- [ ] **Step 4: Verify in a browser**

```bash
pnpm build
python3 -m http.server 8123 &
```

Open `http://localhost:8123/demo/index.html`. On the "Hover & click" card:
- Confirm the text below the chart reads "Hover or click a point" initially.
- Hover over one of the dots: confirm the text changes to "Hovering: index N — value V" with the correct point.
- Move the pointer off the chart entirely: confirm the text reverts to "Hover or click a point".
- Click a dot: confirm the text reads "Selected: index N — value V".
- Move the pointer off the chart: confirm the "Selected: …" text persists (does not revert to idle).
- Hover a different dot, then move off the chart again: confirm it temporarily shows "Hovering: …" for that dot while hovered, then reverts back to the original "Selected: …" text once the pointer leaves.

Stop the server: `kill %1`

- [ ] **Step 5: Run the full test suite one more time (regression check)**

```bash
pnpm test
pnpm typecheck
```

Expected: all PASS, no type errors (this task only touches `demo/index.html`, which isn't covered by `pnpm test`/`typecheck`, but this confirms Tasks 2–4's library changes are still green).

- [ ] **Step 6: Commit**

```bash
git add demo/index.html
git commit -m "$(cat <<'EOF'
feat(demo): add interactive hover/click line card

Vanilla pointermove/click listeners read the data-index attribute
toSVG now emits on dot circles and display the corresponding
scene.points entry below the chart. No library changes — purely
demo-side wiring on top of the existing Scene/toSVG output.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §2.1 (`strokeDasharray`/`strokeLinecap`) → Tasks 2, 3, 4. ✓
- §2.2 (`dotRadius`) → Task 3 (and `lines()`'s per-series `dotRadius` in Task 4). ✓
- §2.3 (`lines()` multi-series overlay, `ScenePoint.seriesIndex`/`seriesLabel`) → Task 4. ✓
- §2.4 (hit-testing `data-index`/`data-series`) → Tasks 2 (rendering), 3 (`line()` tagging), 4 (`lines()` tagging). ✓
- §3.1 (remove group counts) → Task 1. ✓
- §3.2 (remove Line single-point "Fixed" badge) → Task 1. ✓
- §3.3 (Multiple series card) → Task 5. ✓
- §3.4 (Hover & click card) → Task 6. ✓
- §4 (out of scope) — no task adds a tooltip UI, keyboard interaction, or touches Area/Heatmap/other chart types. ✓

**Placeholder scan:** No TBD/TODO; every step has complete, runnable code.

**Type consistency:** `LineSeries.name` (not `label`, avoiding the `Partial<SeriesAccessors<T>>.label` accessor collision caught during planning) is used consistently in Task 4's interface, implementation, and tests, and in Task 5's demo card. `dotRadius`, `strokeDasharray`, `strokeLinecap` option names match exactly between `LineOptions` (Task 3), `LineSeries` (Task 4), and their `Mark` counterparts (Task 2). `Mark.circle.index` is set consistently: `line()` sets it to the point's position in its own `points` array (Task 3); `lines()` sets it to the point's position in its own flattened `points` array via `points.length + i` computed before that series' points are appended (Task 4) — both match the §2.4 contract ("equal to that point's position in the returned `scene.points` array") that Task 6's demo JS relies on (`scene.points[Number(indexAttr)]`).
