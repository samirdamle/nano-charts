# Area Chart Fill/Line Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `area()` so its shaded region renders with no border, and add a `fillColor` option so the fill can use a different color than the line.

**Architecture:** `area()` (`src/charts/area.ts`) already builds two SVG marks per scene — a closed fill `path` and a top-edge `polyline`. The fill path currently omits `stroke`, so it inherits `stroke="currentColor"` from the root `<svg>` in `toSVG` (`src/render/to-svg.ts:52`), producing a visible outline around the whole shape. This plan (1) pins the fill path's `stroke` to `'none'`, and (2) adds a `fillColor` option (mirroring `winColor`/`lossColor` in `src/charts/win-loss.ts:11-13,22-23`) so the fill's color can diverge from the line's `color`. A demo card is added to show the option off.

**Tech Stack:** TypeScript, Vitest, no runtime dependencies (SVG string templates).

## Global Constraints

- Existing calls to `area()` must render identically except for the border removal — `fillColor` defaults to `color`, so `fill` output is unchanged when `fillColor` is omitted.
- `fillOpacity` default stays `0.2` (unchanged).
- The single-point fallback (`area([5])` → a `circle` mark) is unaffected by both changes.
- Follow the existing option-resolution pattern: `const x = options.x ?? fallback;` near the top of the chart function (see `src/charts/area.ts:15-19`).

---

### Task 1: Remove the stray border from the fill path

**Files:**
- Modify: `src/charts/area.ts:56-65`
- Test: `tests/charts/area.test.ts:5-16`

**Interfaces:**
- Consumes: nothing new — uses the existing `color`, `fillOpacity`, `points`, `layout.bottom` already in scope in `area()`.
- Produces: the fill `path` mark now always includes `stroke: 'none'`, which Task 2 builds on (it does not touch the `stroke` field).

- [ ] **Step 1: Update the existing test to expect `stroke: 'none'` on the fill path**

Replace the first test in `tests/charts/area.test.ts` (currently lines 5-16):

```ts
  it('produces a filled path to the baseline plus a top stroke', () => {
    const scene = area([0, 10, 5]);
    const path = scene.marks.find((m) => m.type === 'path');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(path).toEqual({
      type: 'path',
      d: 'M1,19 L1,19 L50,1 L99,10 L99,19 Z',
      fill: 'currentColor',
      fillOpacity: 0.2,
      stroke: 'none',
    });
    expect(poly).toMatchObject({ type: 'polyline', points: [[1, 19], [50, 1], [99, 10]] });
  });
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/charts/area.test.ts`
Expected: FAIL — the first test fails because the actual `path` object has no `stroke` key, so it doesn't equal the expected object that now includes `stroke: 'none'`.

- [ ] **Step 3: Add `stroke: 'none'` to the fill path mark**

In `src/charts/area.ts`, change the `marks.push(...)` call (currently lines 56-65):

```ts
    marks.push(
      { type: 'path', d, fill: color, fillOpacity, stroke: 'none' },
      {
        type: 'polyline',
        points: points.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
      },
    );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/charts/area.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS (92 tests) — no other test asserts on the area fill path's exact shape.

- [ ] **Step 6: Commit**

```bash
git add src/charts/area.ts tests/charts/area.test.ts
git commit -m "fix: remove stray border from area chart fill path

Closes #6"
```

---

### Task 2: Add a `fillColor` option

**Files:**
- Modify: `src/charts/area.ts:7-19,56-65`
- Test: `tests/charts/area.test.ts` (append new tests)

**Interfaces:**
- Consumes: Task 1's fill path mark shape (`{ type: 'path', d, fill, fillOpacity, stroke: 'none' }`) — this task only changes the `fill` field's value source, from `color` to a new `fillColor` variable.
- Produces: `AreaOptions.fillColor?: string`, and a `fillColor` local variable inside `area()` resolved as `options.fillColor ?? color`. No other task depends on this.

- [ ] **Step 1: Write the failing tests**

Append to `tests/charts/area.test.ts`, inside the existing `describe('area', ...)` block (after the last `it(...)`, before the closing `});`):

```ts
  it('uses fillColor for the fill when provided, independent of the line color', () => {
    const scene = area([0, 10, 5], { color: 'blue', fillColor: 'green' });
    const path = scene.marks.find((m) => m.type === 'path');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(path).toMatchObject({ fill: 'green', stroke: 'none' });
    expect(poly).toMatchObject({ stroke: 'blue' });
  });

  it('defaults fillColor to color when not provided', () => {
    const scene = area([0, 10, 5], { color: 'purple' });
    const path = scene.marks.find((m) => m.type === 'path');
    expect(path).toMatchObject({ fill: 'purple' });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/charts/area.test.ts`
Expected: FAIL — `AreaOptions` has no `fillColor` field yet (TypeScript will also flag this if you typecheck), and the fill path's `fill` is `'blue'` (from `color`), not `'green'`.

- [ ] **Step 3: Add `fillColor` to `AreaOptions` and resolve it**

In `src/charts/area.ts`, change the interface (currently lines 7-12):

```ts
export interface AreaOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  strokeWidth?: number;
  fillOpacity?: number;
  fillColor?: string;
}
```

Then, in `area()`, right after the existing `const color = options.color ?? 'currentColor';` (currently line 17), add:

```ts
  const fillColor = options.fillColor ?? color;
```

- [ ] **Step 4: Use `fillColor` in the fill path mark**

Change the `marks.push(...)` call from Task 1:

```ts
    marks.push(
      { type: 'path', d, fill: fillColor, fillOpacity, stroke: 'none' },
      {
        type: 'polyline',
        points: points.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
      },
    );
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/charts/area.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Run the full test suite and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: both PASS

- [ ] **Step 7: Commit**

```bash
git add src/charts/area.ts tests/charts/area.test.ts
git commit -m "feat: add fillColor option to area()

Closes #7"
```

---

### Task 3: Demo card showing a custom `fillColor`

**Files:**
- Modify: `demo/index.html:301-304`

**Interfaces:**
- Consumes: `area()`'s new `fillColor` option from Task 2, and the existing `--accent` / `--series-2` CSS custom properties already used elsewhere in the demo (`demo/index.html:17,21`, e.g. the "Multiple series" line card at `demo/index.html:288-292`).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Add the new card to the Area group**

In `demo/index.html`, change the `group('Area', [...])` call (currently lines 301-304):

```js
  group('Area', [
    { title: 'Basic', scene: area([1, 4, 2, 8, 3]) },
    { title: 'Single point — renders as a dot', scene: area([5]) },
    {
      title: 'Custom fill color',
      scene: area([1, 4, 2, 8, 3], {
        color: 'var(--accent)',
        fillColor: 'var(--series-2)',
        fillOpacity: 0.35,
      }),
    },
  ]);
```

- [ ] **Step 2: Build the library so the demo's `dist/index.js` import resolves**

Run: `pnpm build`
Expected: build succeeds, `dist/` is refreshed with the new `fillColor` option.

- [ ] **Step 3: Visually verify the new card in a browser**

Open `demo/index.html` directly in a browser (e.g. `open demo/index.html` on macOS), scroll to the "Area" section, and confirm:
- The "Basic" and "Single point" cards look the same as before (no visible border around the fill).
- The new "Custom fill color" card shows a line in the accent color with a green-tinted fill beneath it, and the fill has no visible outline.

- [ ] **Step 4: Commit**

```bash
git add demo/index.html
git commit -m "feat(demo): add area chart custom fill color card"
```
