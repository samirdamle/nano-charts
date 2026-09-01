# nano-charts-react + monorepo restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the single-package `nano-charts` repo into a pnpm monorepo (`packages/core`, `packages/react`) and add `@samirdamle/nano-charts-react`, a set of React components (one per chart) that wrap the existing core `Scene`-producing functions with hover/click interactivity.

**Architecture:** Each React component destructures `data` plus the same options its core function counterpart takes, calls that core function to get a `Scene`, and renders `scene.marks` via a shared `<Marks>` renderer and `scene.points` via a shared `<PointHitTargets>` overlay (transparent hit circles wired to `onPointHover`/`onPointClick`). No internal component state is needed — handlers fire directly on DOM events — so there is no hover-state hook; this is a deliberate simplification of the approved design spec's sketch, since no visual behavior depends on "currently hovered," only the callback firing.

**Tech Stack:** pnpm workspaces, TypeScript 5.5, tsup (dual ESM/CJS + `.d.ts`), Vitest (+ `jsdom`, `@testing-library/react` for the React package), ESLint, Changesets.

## Global Constraints

- Package manager: pnpm. Node: `>=18`.
- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true` (from the existing `tsconfig.json`).
- ESLint: `@typescript-eslint/no-explicit-any: 'error'` (existing rule, must continue to pass).
- Prettier: `singleQuote: true, semi: true, printWidth: 100, trailingComma: 'all'` (existing `.prettierrc.json`, unchanged, root-only).
- No new runtime dependencies in `@samirdamle/nano-charts` (core stays zero-dependency).
- `@samirdamle/nano-charts-react`: `react`/`react-dom` are `peerDependencies` only (`>=17.0.0` — required by the automatic JSX runtime), never bundled by tsup (`external: ['react', 'react-dom']`).
- No built-in tooltip UI; interactivity is exposed only via `onPointHover`/`onPointClick` callback props (per approved spec §5).
- Every chart component file starts with `'use client'` (Next.js App Router / RSC compatibility, per approved spec §5).
- Per-chart subpath exports mirror core's pattern (`@samirdamle/nano-charts-react/line`, `/area`, …) — every published entry must independently tree-shake.
- Independent versioning via Changesets — a changeset can target one or both packages (per approved spec §7).
- All work happens in the current worktree (`.claude/worktrees/nano-charts-react-monorepo`, branch `worktree-nano-charts-react-monorepo`) — do not touch the main repo working directory, which another agent is actively using.

---

### Task 1: Restructure repo into a pnpm monorepo (`packages/core`)

**Files:**
- Move: `src/` → `packages/core/src/`
- Move: `tests/` → `packages/core/tests/`
- Move: `tsup.config.ts` → `packages/core/tsup.config.ts`
- Move: `vitest.config.ts` → `packages/core/vitest.config.ts`
- Move: `.size-limit.json` → `packages/core/.size-limit.json`
- Move: `package.json` → `packages/core/package.json` (content edited)
- Move: `tsconfig.json` → `tsconfig.base.json` (stays at root, content edited)
- Create: `packages/core/tsconfig.json`
- Create: `package.json` (new root, private workspace root)
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Produces: `@samirdamle/nano-charts` package now lives at `packages/core`, published under the unchanged name/version/exports — nothing in its public API changes. Later tasks depend on `packages/core` being buildable via `pnpm --filter @samirdamle/nano-charts run build`.

- [ ] **Step 1: Move core's files with history preserved**

```bash
mkdir -p packages/core
git mv src packages/core/src
git mv tests packages/core/tests
git mv tsup.config.ts packages/core/tsup.config.ts
git mv vitest.config.ts packages/core/vitest.config.ts
git mv .size-limit.json packages/core/.size-limit.json
git mv package.json packages/core/package.json
git mv tsconfig.json tsconfig.base.json
```

- [ ] **Step 2: Trim `tsconfig.base.json` to shared options only**

Edit `tsconfig.base.json` — remove `outDir` and `include` (they become per-package):

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
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 3: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Edit `packages/core/package.json`**

Same name/version/exports/scripts as before, minus `format` (now root-only) and `@changesets/cli`/`prettier` (now root-only concerns), plus a `directory` field on `repository`:

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
  "repository": { "type": "git", "url": "git+https://github.com/samirdamle/nano-charts.git", "directory": "packages/core" },
  "homepage": "https://github.com/samirdamle/nano-charts#readme",
  "publishConfig": { "access": "public" },
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
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts",
    "size": "size-limit"
  },
  "dependencies": {},
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.6",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.57.0",
    "size-limit": "^11.1.6",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 5: Create the new root `package.json` (private workspace root)**

```json
{
  "name": "nano-charts-monorepo",
  "private": true,
  "license": "MIT",
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "typecheck": "pnpm -r run typecheck",
    "lint": "pnpm -r run lint",
    "format": "prettier --write .",
    "size": "pnpm -r run size"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.7",
    "prettier": "^3.3.3"
  }
}
```

- [ ] **Step 6: Add the workspace glob to `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
allowBuilds:
  esbuild: true
onlyBuiltDependencies:
  - esbuild
verifyDepsBeforeRun: false
```

- [ ] **Step 7: Install and verify core still builds, tests, lints, and typechecks from its new location**

```bash
pnpm install
pnpm --filter @samirdamle/nano-charts run build
pnpm --filter @samirdamle/nano-charts run test
pnpm --filter @samirdamle/nano-charts run typecheck
pnpm --filter @samirdamle/nano-charts run lint
pnpm --filter @samirdamle/nano-charts run size
```

Expected: all five commands exit 0. `test` reports the same test count as before the move (`tests/index.test.ts` plus per-chart tests). `size` reports all three budgets (`line`, `toSVG`, `full barrel`) under their limits.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: restructure repo into a pnpm monorepo (packages/core)

Moves the existing single package into packages/core with git mv (history
preserved) and turns the repo root into a private pnpm workspace root, in
preparation for adding @samirdamle/nano-charts-react as a sibling package.
No change to the published @samirdamle/nano-charts package itself.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update CI, release workflow, and verify Changesets for the monorepo

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: root scripts `build`/`test`/`typecheck`/`lint`/`size` from Task 1 (each now fans out via `pnpm -r`).
- Produces: CI that validates every workspace package on every PR; a release workflow that publishes whichever packages have pending changesets.

- [ ] **Step 1: Update `.github/workflows/ci.yml` to run workspace-wide**

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

(Unchanged from before — the commands already delegate to `pnpm -r` per Task 1's root scripts, so this file only needs re-confirming, not rewriting. If it still reads exactly as above, no diff is needed.)

- [ ] **Step 2: Update `.github/workflows/release.yml` to build all packages before publishing**

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

(Also unchanged — `pnpm build` already delegates to `pnpm -r run build` per Task 1, and `changeset publish` is monorepo-aware by default once `pnpm-workspace.yaml` lists `packages/*`, with no change needed to `.changeset/config.json`.)

- [ ] **Step 3: Verify Changesets discovers both future packages**

```bash
pnpm exec changeset status --verbose
```

Expected: output lists `@samirdamle/nano-charts` as a workspace package (0 pending changesets at this point, since none have been added yet). No error about missing/unconfigured workspaces.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "$(cat <<'EOF'
ci: confirm CI and release workflows are monorepo-ready

Both workflows already delegated to root pnpm scripts, which now fan out
via pnpm -r after the Task 1 restructure — no command changes needed, this
just re-verifies changeset workspace discovery works post-restructure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

If Step 1 or 2 found the files already matched (no diff), skip the commit for that file and only commit if `git status` shows a change; if neither file changed, skip this task's commit entirely and note it in the task handoff.

---

### Task 3: Scaffold `packages/react` + shared `Marks` renderer + core `SeriesInput` export

**Files:**
- Modify: `packages/core/src/index.ts` (export `SeriesInput` type)
- Create: `.changeset/export-series-input-type.md`
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`
- Create: `packages/react/tsup.config.ts`
- Create: `packages/react/vitest.config.ts`
- Create: `packages/react/.eslintrc.cjs`
- Create: `packages/react/src/types.ts`
- Create: `packages/react/src/render/Marks.tsx`
- Create: `packages/react/tests/Marks.test.tsx`

**Interfaces:**
- Consumes: `Mark` type from `@samirdamle/nano-charts` (already exported per `packages/core/src/index.ts`).
- Produces: `InteractionProps` (from `packages/react/src/types.ts`) — used by every chart component from Task 5 onward:
  ```ts
  export interface InteractionProps {
    onPointHover?: (point: ScenePoint | null) => void;
    onPointClick?: (point: ScenePoint) => void;
    className?: string;
    style?: CSSProperties;
    hitRadius?: number;
  }
  ```
- Produces: `Marks` component (`packages/react/src/render/Marks.tsx`) — `function Marks({ marks }: { marks: Mark[] }): JSX.Element`, used by every chart component from Task 5 onward.
- Produces: `SeriesInput<T>` now importable from `@samirdamle/nano-charts` — used by `LineChart`, `AreaChart`, `WinLossChart` (Tasks 5, 6, 8).

- [ ] **Step 1: Export `SeriesInput` from core's public API**

Edit `packages/core/src/index.ts`, add this line (anywhere among the other `export type` lines):

```ts
export type { SeriesInput } from './core/normalize';
```

- [ ] **Step 2: Add a changeset for the core export addition**

Create `.changeset/export-series-input-type.md`:

```markdown
---
'@samirdamle/nano-charts': patch
---

Export the `SeriesInput<T>` type from the public API, so downstream packages (e.g. `@samirdamle/nano-charts-react`) can type a chart's `data` prop without redeclaring it.
```

- [ ] **Step 3: Rebuild core so its `dist` (and therefore its type declarations) are up to date for workspace consumers**

```bash
pnpm --filter @samirdamle/nano-charts run build
```

Expected: exits 0, `packages/core/dist/index.d.ts` now includes `SeriesInput`.

- [ ] **Step 4: Create `packages/react/package.json`**

```json
{
  "name": "@samirdamle/nano-charts-react",
  "version": "0.0.0",
  "description": "React components for @samirdamle/nano-charts — tiny SVG charts with hover/click interactivity.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "files": ["dist"],
  "repository": { "type": "git", "url": "git+https://github.com/samirdamle/nano-charts.git", "directory": "packages/react" },
  "homepage": "https://github.com/samirdamle/nano-charts#readme",
  "publishConfig": { "access": "public" },
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
    "./heatmap": { "types": "./dist/heatmap.d.ts", "import": "./dist/heatmap.js", "require": "./dist/heatmap.cjs" }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "size": "size-limit"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "dependencies": {
    "@samirdamle/nano-charts": "workspace:*"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.6",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "jsdom": "^25.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "size-limit": "^11.1.6",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 5: Create `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: Create `packages/react/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    line: 'src/charts/LineChart.tsx',
    area: 'src/charts/AreaChart.tsx',
    bar: 'src/charts/BarChart.tsx',
    'win-loss': 'src/charts/WinLossChart.tsx',
    bullet: 'src/charts/BulletChart.tsx',
    donut: 'src/charts/DonutChart.tsx',
    scatter: 'src/charts/ScatterChart.tsx',
    heatmap: 'src/charts/HeatmapChart.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  outDir: 'dist',
});
```

This references chart component files that don't exist until Tasks 5–12 — that's expected. This task only runs Vitest (not `tsup build`), so the missing files don't block it. The first full `pnpm --filter @samirdamle/nano-charts-react run build` happens in Task 13.

- [ ] **Step 7: Create `packages/react/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', include: ['tests/**/*.test.tsx'] },
  esbuild: { jsx: 'automatic' },
});
```

- [ ] **Step 8: Create `packages/react/.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2021: true },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'react-hooks/rules-of-hooks': 'error',
  },
};
```

- [ ] **Step 9: Create `packages/react/src/types.ts`**

```ts
import type { CSSProperties } from 'react';
import type { ScenePoint } from '@samirdamle/nano-charts';

export interface InteractionProps {
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
  className?: string;
  style?: CSSProperties;
  hitRadius?: number;
}
```

- [ ] **Step 10: Write the failing test for `Marks`**

Create `packages/react/tests/Marks.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Marks } from '../src/render/Marks';
import type { Mark } from '@samirdamle/nano-charts';

describe('Marks', () => {
  it('renders a polyline mark', () => {
    const marks: Mark[] = [{ type: 'polyline', points: [[0, 0], [10, 10]], stroke: 'red', strokeWidth: 2 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('polyline');
    expect(el?.getAttribute('points')).toBe('0,0 10,10');
    expect(el?.getAttribute('stroke')).toBe('red');
    expect(el?.getAttribute('stroke-width')).toBe('2');
  });

  it('renders a path mark', () => {
    const marks: Mark[] = [{ type: 'path', d: 'M0,0 L10,10 Z', fill: 'blue', fillOpacity: 0.5 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('path');
    expect(el?.getAttribute('d')).toBe('M0,0 L10,10 Z');
    expect(el?.getAttribute('fill')).toBe('blue');
    expect(el?.getAttribute('fill-opacity')).toBe('0.5');
  });

  it('renders a rect mark', () => {
    const marks: Mark[] = [{ type: 'rect', x: 1, y: 2, width: 3, height: 4, fill: 'green', rx: 1 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('rect');
    expect(el?.getAttribute('x')).toBe('1');
    expect(el?.getAttribute('width')).toBe('3');
    expect(el?.getAttribute('rx')).toBe('1');
  });

  it('renders a circle mark', () => {
    const marks: Mark[] = [{ type: 'circle', cx: 5, cy: 5, r: 2, fill: 'purple' }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('circle');
    expect(el?.getAttribute('cx')).toBe('5');
    expect(el?.getAttribute('r')).toBe('2');
  });

  it('renders a line mark', () => {
    const marks: Mark[] = [{ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, stroke: 'black', strokeWidth: 1 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('line');
    expect(el?.getAttribute('x2')).toBe('10');
  });
});
```

- [ ] **Step 11: Install dependencies, then run the test to verify it fails**

```bash
pnpm install
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/Marks.test.tsx
```

Expected: FAIL — `Cannot find module '../src/render/Marks'`.

- [ ] **Step 12: Implement `Marks`**

Create `packages/react/src/render/Marks.tsx`:

```tsx
import type { Mark } from '@samirdamle/nano-charts';

export function Marks({ marks }: { marks: Mark[] }) {
  return (
    <>
      {marks.map((mark, i) => {
        switch (mark.type) {
          case 'polyline':
            return (
              <polyline
                key={i}
                points={mark.points.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={mark.fill ?? 'none'}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
              />
            );
          case 'path':
            return (
              <path
                key={i}
                d={mark.d}
                fill={mark.fill}
                fillOpacity={mark.fillOpacity}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
              />
            );
          case 'rect':
            return (
              <rect
                key={i}
                x={mark.x}
                y={mark.y}
                width={mark.width}
                height={mark.height}
                rx={mark.rx}
                fill={mark.fill}
                fillOpacity={mark.fillOpacity}
              />
            );
          case 'circle':
            return (
              <circle
                key={i}
                cx={mark.cx}
                cy={mark.cy}
                r={mark.r}
                fill={mark.fill}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
              />
            );
          case 'line':
            return (
              <line
                key={i}
                x1={mark.x1}
                y1={mark.y1}
                x2={mark.x2}
                y2={mark.y2}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
              />
            );
        }
      })}
    </>
  );
}
```

- [ ] **Step 13: Run the test to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/Marks.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 14: Commit**

```bash
git add packages/core/src/index.ts .changeset/export-series-input-type.md packages/react pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat: scaffold nano-charts-react package with shared Marks renderer

Adds the packages/react skeleton (build/test/lint tooling) and the first
shared piece: a Marks component that maps core's Mark[] scene output to
SVG elements. Also exports SeriesInput from core's public API so chart
components can type their data prop without redeclaring it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Shared `PointHitTargets`

**Files:**
- Create: `packages/react/src/render/PointHitTargets.tsx`
- Create: `packages/react/tests/PointHitTargets.test.tsx`

**Interfaces:**
- Consumes: `ScenePoint` from `@samirdamle/nano-charts`; `InteractionProps` shape conventions from Task 3.
- Produces: `PointHitTargets` component — `function PointHitTargets(props: { points: ScenePoint[]; hitRadius: number; onPointHover?: (p: ScenePoint | null) => void; onPointClick?: (p: ScenePoint) => void }): JSX.Element | null`, used by every chart component from Task 5 onward. Hit targets are `<circle fill="transparent" .../>` elements — this is also the selector (`circle[fill="transparent"]`) every chart component's tests use to find them, since some charts' visual marks are also circles.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/PointHitTargets.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PointHitTargets } from '../src/render/PointHitTargets';
import type { ScenePoint } from '@samirdamle/nano-charts';

const points: ScenePoint[] = [
  { id: 0, label: 'a', value: 1, index: 0, x: 10, y: 10 },
  { id: 1, label: 'b', value: 2, index: 1, x: 20, y: 20 },
];

describe('PointHitTargets', () => {
  it('renders nothing when neither onPointHover nor onPointClick is given', () => {
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} />
      </svg>,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders one transparent hit circle per point when a handler is given', () => {
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    expect(circles[0]?.getAttribute('r')).toBe('4');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointHover={onPointHover} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.mouseEnter(circles[1]!);
    expect(onPointHover).toHaveBeenCalledWith(points[1]);
    fireEvent.mouseLeave(circles[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointClick={onPointClick} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(circles[0]!);
    expect(onPointClick).toHaveBeenCalledWith(points[0]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/PointHitTargets.test.tsx
```

Expected: FAIL — `Cannot find module '../src/render/PointHitTargets'`.

- [ ] **Step 3: Implement `PointHitTargets`**

Create `packages/react/src/render/PointHitTargets.tsx`:

```tsx
import type { ScenePoint } from '@samirdamle/nano-charts';

export interface PointHitTargetsProps {
  points: ScenePoint[];
  hitRadius: number;
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
}

export function PointHitTargets({ points, hitRadius, onPointHover, onPointClick }: PointHitTargetsProps) {
  if (!onPointHover && !onPointClick) return null;
  return (
    <>
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={hitRadius}
          fill="transparent"
          onMouseEnter={onPointHover ? () => onPointHover(point) : undefined}
          onMouseLeave={onPointHover ? () => onPointHover(null) : undefined}
          onClick={onPointClick ? () => onPointClick(point) : undefined}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/PointHitTargets.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/render/PointHitTargets.tsx packages/react/tests/PointHitTargets.test.tsx
git commit -m "$(cat <<'EOF'
feat: add shared PointHitTargets component for chart interactivity

Renders one invisible, transparent-fill hit circle per ScenePoint, wired
to onPointHover/onPointClick. Every chart component (Tasks 5-12) composes
this alongside Marks to get consistent hover/click behavior for free.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `LineChart`

**Files:**
- Create: `packages/react/src/charts/LineChart.tsx`
- Create: `packages/react/tests/LineChart.test.tsx`

**Interfaces:**
- Consumes: `line`, `LineOptions<T>`, `SeriesInput<T>` from `@samirdamle/nano-charts`; `Marks` and `PointHitTargets` from Task 3/4; `InteractionProps` from Task 3.
- Produces: `LineChart<T = number>(props: LineChartProps<T>)` and `LineChartProps<T>` — re-exported from the barrel in Task 13.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/LineChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LineChart } from '../src/charts/LineChart';
import { line } from '@samirdamle/nano-charts';

describe('LineChart', () => {
  it('renders the same marks as the core line() function, with correct a11y', () => {
    const { container } = render(<LineChart data={[4, 9, 2, 7, 5]} dot="all" title="my chart" />);
    const scene = line([4, 9, 2, 7, 5], { dot: 'all' });
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('svg > circle')).toHaveLength(
      scene.marks.filter((m) => m.type === 'circle').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('title')?.textContent).toBe('my chart');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<LineChart data={[4, 9, 2]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: 9 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<LineChart data={[4, 9, 2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 4 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/LineChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/LineChart'`.

- [ ] **Step 3: Implement `LineChart`**

Create `packages/react/src/charts/LineChart.tsx`:

```tsx
'use client';

import { line, type LineOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface LineChartProps<T = number> extends LineOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function LineChart<T = number>(props: LineChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = line(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/LineChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/LineChart.tsx packages/react/tests/LineChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add LineChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `AreaChart`

**Files:**
- Create: `packages/react/src/charts/AreaChart.tsx`
- Create: `packages/react/tests/AreaChart.test.tsx`

**Interfaces:**
- Consumes: `area`, `AreaOptions<T>`, `SeriesInput<T>` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `AreaChart<T = number>(props: AreaChartProps<T>)` and `AreaChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/AreaChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AreaChart } from '../src/charts/AreaChart';
import { area } from '@samirdamle/nano-charts';

describe('AreaChart', () => {
  it('renders the same marks as the core area() function', () => {
    const { container } = render(<AreaChart data={[4, 9, 2, 7, 5]} />);
    const scene = area([4, 9, 2, 7, 5]);
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<AreaChart data={[4, 9, 2]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 2, value: 2 }));
    fireEvent.mouseLeave(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<AreaChart data={[4, 9, 2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 4 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/AreaChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/AreaChart'`.

- [ ] **Step 3: Implement `AreaChart`**

Create `packages/react/src/charts/AreaChart.tsx`:

```tsx
'use client';

import { area, type AreaOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface AreaChartProps<T = number> extends AreaOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function AreaChart<T = number>(props: AreaChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = area(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/AreaChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/AreaChart.tsx packages/react/tests/AreaChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add AreaChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `BarChart`

**Files:**
- Create: `packages/react/src/charts/BarChart.tsx`
- Create: `packages/react/tests/BarChart.test.tsx`

**Interfaces:**
- Consumes: `bar`, `BarOptions<T>`, `BarInput<T>` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `BarChart<T = number>(props: BarChartProps<T>)` and `BarChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/BarChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BarChart } from '../src/charts/BarChart';
import { bar } from '@samirdamle/nano-charts';

describe('BarChart', () => {
  it('renders one rect per segment, matching the core bar() function', () => {
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} />);
    const scene = bar(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(
      scene.marks.filter((m) => m.type === 'rect').length,
    );
  });

  it('fires onPointHover with the segment point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ col: 0, row: 0, value: 1 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the segment point', () => {
    const onPointClick = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ col: 1, row: 1, value: 4 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/BarChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/BarChart'`.

- [ ] **Step 3: Implement `BarChart`**

Create `packages/react/src/charts/BarChart.tsx`:

```tsx
'use client';

import { bar, type BarOptions, type BarInput } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface BarChartProps<T = number> extends BarOptions<T>, InteractionProps {
  data: BarInput<T>;
}

export function BarChart<T = number>(props: BarChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = bar(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/BarChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/BarChart.tsx packages/react/tests/BarChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add BarChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `WinLossChart`

**Files:**
- Create: `packages/react/src/charts/WinLossChart.tsx`
- Create: `packages/react/tests/WinLossChart.test.tsx`

**Interfaces:**
- Consumes: `winLoss`, `WinLossOptions<T>`, `SeriesInput<T>` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `WinLossChart<T = number>(props: WinLossChartProps<T>)` and `WinLossChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/WinLossChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WinLossChart } from '../src/charts/WinLossChart';
import { winLoss } from '@samirdamle/nano-charts';

describe('WinLossChart', () => {
  it('renders one rect per point, matching the core winLoss() function', () => {
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} />);
    const scene = winLoss(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: -2 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 3, value: 5 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/WinLossChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/WinLossChart'`.

- [ ] **Step 3: Implement `WinLossChart`**

Create `packages/react/src/charts/WinLossChart.tsx`:

```tsx
'use client';

import { winLoss, type WinLossOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface WinLossChartProps<T = number> extends WinLossOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function WinLossChart<T = number>(props: WinLossChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = winLoss(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/WinLossChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/WinLossChart.tsx packages/react/tests/WinLossChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add WinLossChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `BulletChart`

**Files:**
- Create: `packages/react/src/charts/BulletChart.tsx`
- Create: `packages/react/tests/BulletChart.test.tsx`

**Interfaces:**
- Consumes: `bullet`, `BulletOptions`, `BulletData` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5. Not generic (core's `bullet` isn't generic).
- Produces: `BulletChart(props: BulletChartProps)` and `BulletChartProps`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/BulletChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BulletChart } from '../src/charts/BulletChart';
import { bullet } from '@samirdamle/nano-charts';

describe('BulletChart', () => {
  it('renders the same marks as the core bullet() function', () => {
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletChart data={data} />);
    const scene = bullet(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(
      scene.marks.filter((m) => m.type === 'rect').length,
    );
    expect(container.querySelectorAll('svg > line')).toHaveLength(
      scene.marks.filter((m) => m.type === 'line').length,
    );
  });

  it('fires onPointHover with the value point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(1);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ value: 7 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the value point', () => {
    const onPointClick = vi.fn();
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ value: 7 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/BulletChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/BulletChart'`.

- [ ] **Step 3: Implement `BulletChart`**

Create `packages/react/src/charts/BulletChart.tsx`:

```tsx
'use client';

import { bullet, type BulletOptions, type BulletData } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface BulletChartProps extends BulletOptions, InteractionProps {
  data: BulletData;
}

export function BulletChart(props: BulletChartProps) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = bullet(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/BulletChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/BulletChart.tsx packages/react/tests/BulletChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add BulletChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `DonutChart`

**Files:**
- Create: `packages/react/src/charts/DonutChart.tsx`
- Create: `packages/react/tests/DonutChart.test.tsx`

**Interfaces:**
- Consumes: `donut`, `DonutOptions<T>`, `DonutInput<T>` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `DonutChart<T = number>(props: DonutChartProps<T>)` and `DonutChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/DonutChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DonutChart } from '../src/charts/DonutChart';
import { donut } from '@samirdamle/nano-charts';

describe('DonutChart', () => {
  it('renders the same arc paths as the core donut() function (gauge mode)', () => {
    const data = { value: 3, max: 4 };
    const { container } = render(<DonutChart data={data} />);
    const scene = donut(data);
    expect(container.querySelectorAll('svg > path')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the gauge point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = { value: 3, max: 4 };
    const { container } = render(<DonutChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(1);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the segment point (segment mode)', () => {
    const onPointClick = vi.fn();
    const data = [
      { id: 'a', label: 'A', value: 1 },
      { id: 'b', label: 'B', value: 3 },
    ];
    const { container } = render(<DonutChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(2);
    fireEvent.click(hitTargets[1]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', value: 3 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/DonutChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/DonutChart'`.

- [ ] **Step 3: Implement `DonutChart`**

Create `packages/react/src/charts/DonutChart.tsx`:

```tsx
'use client';

import { donut, type DonutOptions, type DonutInput } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface DonutChartProps<T = number> extends DonutOptions<T>, InteractionProps {
  data: DonutInput<T>;
}

export function DonutChart<T = number>(props: DonutChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = donut(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/DonutChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/DonutChart.tsx packages/react/tests/DonutChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add DonutChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: `ScatterChart`

**Files:**
- Create: `packages/react/src/charts/ScatterChart.tsx`
- Create: `packages/react/tests/ScatterChart.test.tsx`

**Interfaces:**
- Consumes: `scatter`, `ScatterOptions<T>`, `ScatterInput<T>`, `ScatterPoint` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `ScatterChart<T = ScatterPoint>(props: ScatterChartProps<T>)` and `ScatterChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/ScatterChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ScatterChart } from '../src/charts/ScatterChart';
import { scatter } from '@samirdamle/nano-charts';

describe('ScatterChart', () => {
  it('renders one visual circle per point, matching the core scatter() function', () => {
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} />);
    const scene = scatter(data);
    expect(container.querySelectorAll('svg > circle')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: 4 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 2 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/ScatterChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/ScatterChart'`.

- [ ] **Step 3: Implement `ScatterChart`**

Create `packages/react/src/charts/ScatterChart.tsx`:

```tsx
'use client';

import { scatter, type ScatterOptions, type ScatterInput, type ScatterPoint } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface ScatterChartProps<T = ScatterPoint> extends ScatterOptions<T>, InteractionProps {
  data: ScatterInput<T>;
}

export function ScatterChart<T = ScatterPoint>(props: ScatterChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = scatter(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/ScatterChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/ScatterChart.tsx packages/react/tests/ScatterChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add ScatterChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `HeatmapChart`

**Files:**
- Create: `packages/react/src/charts/HeatmapChart.tsx`
- Create: `packages/react/tests/HeatmapChart.test.tsx`

**Interfaces:**
- Consumes: `heatmap`, `HeatmapOptions<T>` from `@samirdamle/nano-charts`; `Marks`/`PointHitTargets`/`InteractionProps` as in Task 5.
- Produces: `HeatmapChart<T = number>(props: HeatmapChartProps<T>)` and `HeatmapChartProps<T>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/tests/HeatmapChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HeatmapChart } from '../src/charts/HeatmapChart';
import { heatmap } from '@samirdamle/nano-charts';

describe('HeatmapChart', () => {
  it('renders one rect per cell, matching the core heatmap() function', () => {
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} />);
    const scene = heatmap(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the cell point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ row: 0, col: 0, value: 1 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the cell point', () => {
    const onPointClick = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ row: 1, col: 1, value: 4 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/HeatmapChart.test.tsx
```

Expected: FAIL — `Cannot find module '../src/charts/HeatmapChart'`.

- [ ] **Step 3: Implement `HeatmapChart`**

Create `packages/react/src/charts/HeatmapChart.tsx`:

```tsx
'use client';

import { heatmap, type HeatmapOptions } from '@samirdamle/nano-charts';
import { Marks } from '../render/Marks';
import { PointHitTargets } from '../render/PointHitTargets';
import type { InteractionProps } from '../types';

export interface HeatmapChartProps<T = number> extends HeatmapOptions<T>, InteractionProps {
  data: T[][];
}

export function HeatmapChart<T = number>(props: HeatmapChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius = 4, ...options } = props;
  const scene = heatmap(data, options);
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/HeatmapChart.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/charts/HeatmapChart.tsx packages/react/tests/HeatmapChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add HeatmapChart component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Barrel export, size budgets, and full build verification

**Files:**
- Create: `packages/react/src/index.ts`
- Create: `packages/react/tests/index.test.tsx`
- Create: `packages/react/.size-limit.json`

**Interfaces:**
- Consumes: all 8 chart components from Tasks 5–12.
- Produces: the package's public barrel — every symbol a consumer imports from `@samirdamle/nano-charts-react`.

- [ ] **Step 1: Write the failing test for the barrel**

Create `packages/react/tests/index.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as api from '../src/index';

describe('public API', () => {
  it('exports all eight chart components', () => {
    for (const name of [
      'LineChart',
      'AreaChart',
      'BarChart',
      'WinLossChart',
      'BulletChart',
      'DonutChart',
      'ScatterChart',
      'HeatmapChart',
    ]) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('renders an svg for each component with minimal props', () => {
    const { container: c1 } = render(<api.LineChart data={[1, 2, 3]} />);
    expect(c1.querySelector('svg')).not.toBeNull();
    const { container: c2 } = render(<api.BulletChart data={{ value: 1, target: 2 }} />);
    expect(c2.querySelector('svg')).not.toBeNull();
    const { container: c3 } = render(<api.HeatmapChart data={[[1, 2]]} />);
    expect(c3.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/index.test.tsx
```

Expected: FAIL — `Cannot find module '../src/index'`.

- [ ] **Step 3: Implement the barrel**

Create `packages/react/src/index.ts`:

```ts
export { LineChart, type LineChartProps } from './charts/LineChart';
export { AreaChart, type AreaChartProps } from './charts/AreaChart';
export { BarChart, type BarChartProps } from './charts/BarChart';
export { WinLossChart, type WinLossChartProps } from './charts/WinLossChart';
export { BulletChart, type BulletChartProps } from './charts/BulletChart';
export { DonutChart, type DonutChartProps } from './charts/DonutChart';
export { ScatterChart, type ScatterChartProps } from './charts/ScatterChart';
export { HeatmapChart, type HeatmapChartProps } from './charts/HeatmapChart';
export type { InteractionProps } from './types';
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm --filter @samirdamle/nano-charts-react exec vitest run tests/index.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Run the full react package test suite**

```bash
pnpm --filter @samirdamle/nano-charts-react run test
```

Expected: PASS, all test files (Marks, PointHitTargets, 8 chart components, index) — 29 tests total.

- [ ] **Step 6: Add the size budget config**

Create `packages/react/.size-limit.json`:

```json
[
  { "name": "LineChart (standalone)", "path": "dist/line.js", "import": "{ LineChart }", "limit": "2 kB" },
  { "name": "full barrel", "path": "dist/index.js", "limit": "12 kB" }
]
```

- [ ] **Step 7: Build the package and verify the `'use client'` directive survives bundling**

```bash
pnpm --filter @samirdamle/nano-charts-react run build
head -n 1 packages/react/dist/line.js
head -n 1 packages/react/dist/index.js
```

Expected: `pnpm build` exits 0 with 9 entries (index + 8 charts) × 2 formats + `.d.ts` files in `packages/react/dist`. Both `head` commands print `"use client";` as the first line.

- [ ] **Step 8: Typecheck, lint, and check size**

```bash
pnpm --filter @samirdamle/nano-charts-react run typecheck
pnpm --filter @samirdamle/nano-charts-react run lint
pnpm --filter @samirdamle/nano-charts-react run size
```

Expected: all three exit 0; `size` reports both budgets under their limits.

- [ ] **Step 9: Run the full workspace verification**

```bash
pnpm -r run build
pnpm -r run test
pnpm -r run typecheck
pnpm -r run lint
pnpm -r run size
```

Expected: all five exit 0 across both `packages/core` and `packages/react`.

- [ ] **Step 10: Commit**

```bash
git add packages/react/src/index.ts packages/react/tests/index.test.tsx packages/react/.size-limit.json
git commit -m "$(cat <<'EOF'
feat: add nano-charts-react public barrel and size budgets

Wires up the package's top-level export surface, verifies the full
monorepo builds/tests/lints together, and confirms the 'use client'
directive survives tsup's bundling for Next.js App Router compatibility.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Docs and release changesets

**Files:**
- Modify: `README.md` (root)
- Create: `packages/core/README.md`
- Create: `packages/react/README.md`
- Create: `.changeset/nano-charts-react-initial-release.md`

**Interfaces:**
- Consumes: nothing new — this task only documents the public API established in Tasks 1–13.

- [ ] **Step 1: Move the existing package README into `packages/core`**

```bash
git mv README.md packages/core/README.md
```

`packages/core/README.md` keeps its existing content unchanged (it already accurately describes `@samirdamle/nano-charts`).

- [ ] **Step 2: Create `packages/react/README.md`**

```markdown
# @samirdamle/nano-charts-react

React components for [`@samirdamle/nano-charts`](https://www.npmjs.com/package/@samirdamle/nano-charts) —
tiny SVG charts, with hover/click interactivity built in.

## Install

```sh
npm i @samirdamle/nano-charts-react
```

## Usage

```tsx
import { LineChart } from '@samirdamle/nano-charts-react';

function Sparkline() {
  return (
    <LineChart
      data={[4, 9, 2, 7, 5]}
      dot="last"
      onPointHover={(point) => console.log(point)}
    />
  );
}
```

Every component takes the same `data` and options as its
[`@samirdamle/nano-charts`](../core/README.md) function counterpart, plus:

| Prop | Type | Description |
|------|------|-------------|
| `onPointHover` | `(point: ScenePoint \| null) => void` | Fires on hover enter with the point, and on leave with `null`. |
| `onPointClick` | `(point: ScenePoint) => void` | Fires on click with the point. |
| `hitRadius` | `number` (default `4`) | Radius of the invisible hover/click target around each point, in the chart's internal coordinate space. |
| `className` / `style` | standard React props | Passed to the root `<svg>`. |

No tooltip UI ships with this package — build your own from the callback data.

Works with Next.js App Router (`'use client'` is set on every component) and any
other React 17+ setup.

## Components

`LineChart`, `AreaChart`, `BarChart`, `WinLossChart`, `BulletChart`, `DonutChart`,
`ScatterChart`, `HeatmapChart` — also available as subpath imports for the smallest
bundle, e.g. `import { BarChart } from '@samirdamle/nano-charts-react/bar'`.

## License

MIT © Samir Damle
```

- [ ] **Step 3: Create a new root `README.md` covering both packages**

```markdown
# nano-charts

A monorepo for **tiny SVG charts** — sparklines, micro bars, donuts, bullets, scatter,
and heatmaps — the kind you repeat hundreds of times across table cells and metric
cards.

## Packages

| Package | Description |
|---------|--------------|
| [`@samirdamle/nano-charts`](packages/core/README.md) | Framework-agnostic core: `data → Scene` chart functions + a `toSVG` serializer. Zero runtime dependencies. |
| [`@samirdamle/nano-charts-react`](packages/react/README.md) | React components wrapping the core, with hover/click interactivity. |

Both are independently versioned and published (via [Changesets](https://github.com/changesets/changesets)).

## Development

```sh
pnpm install
pnpm build     # builds every package
pnpm test      # tests every package
pnpm lint       # lints every package
pnpm typecheck  # typechecks every package
```

## License

MIT © Samir Damle
```

- [ ] **Step 4: Add the initial-release changeset for the React package**

Create `.changeset/nano-charts-react-initial-release.md`:

```markdown
---
'@samirdamle/nano-charts-react': minor
---

Initial release: React components for all eight nano-charts (`LineChart`, `AreaChart`, `BarChart`, `WinLossChart`, `BulletChart`, `DonutChart`, `ScatterChart`, `HeatmapChart`), with `onPointHover`/`onPointClick` interactivity and Next.js App Router support.
```

- [ ] **Step 5: Verify Changesets picks up both pending changesets**

```bash
pnpm exec changeset status --verbose
```

Expected: lists two pending changesets — a patch for `@samirdamle/nano-charts` (`export-series-input-type`, from Task 3) and a minor for `@samirdamle/nano-charts-react` (`nano-charts-react-initial-release`).

- [ ] **Step 6: Final full verification**

```bash
pnpm -r run build
pnpm -r run test
pnpm -r run typecheck
pnpm -r run lint
```

Expected: all four exit 0.

- [ ] **Step 7: Commit**

```bash
git add README.md packages/core/README.md packages/react/README.md .changeset/nano-charts-react-initial-release.md
git commit -m "$(cat <<'EOF'
docs: add per-package READMEs and the React package's initial-release changeset

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Handoff to the other in-progress agent

This entire plan runs inside the isolated worktree `.claude/worktrees/nano-charts-react-monorepo` (branch `worktree-nano-charts-react-monorepo`), so it never touches the main working directory another agent is using. Once all 14 tasks are complete and verified, merging this branch back into `feat/nano-charts-v1` is a separate, explicit step to coordinate with the user (and the other agent's work) rather than something to do automatically here.
