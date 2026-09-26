# nano-charts

A monorepo for **tiny SVG charts** — sparklines, micro bars, donuts, bullets, scatter,
and heatmaps — the kind you repeat hundreds of times across table cells and metric
cards.

- **9 kB** minified for all 12 charts — zero runtime dependencies, pure JS + SVG.
- Framework-agnostic core (`data → Scene`) + a `toSVG` serializer; SSR-safe and deterministic.
- Hover and click events, accessible by default, themeable via `currentColor` and CSS variables.
- React wrapper in [`@samirdamle/nano-charts-react`](https://www.npmjs.com/package/@samirdamle/nano-charts-react).
- MIT licensed.

**[Live demo](https://samirdamle.github.io/nano-charts/)** ·
[API reference](docs/API.md) ·
[npm](https://www.npmjs.com/package/@samirdamle/nano-charts)

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
Rendered dots and heatmap cells also carry `data-index` attributes (dots add
`data-series`) in the `toSVG` output, so hit-testing a specific point no longer
requires reverse-mapping coordinates — the DOM node names its own point index.

## Charts

| Chart       | What it's for                                                     |
| ----------- | ----------------------------------------------------------------- |
| `line`      | Trend sparkline — straight segments or smooth spline (`mode`)      |
| `lines`     | Multi-series line overlay (core only)                             |
| `area`      | Filled trend                                                      |
| `bar`       | Magnitude bars — simple, stacked, grouped, or waterfall            |
| `donut`     | Proportion — full or partial dial, segment gaps                   |
| `gauge`     | Dial gauge with arc/needle modes, zones, center label             |
| `scatter`   | 2D relationship — per-point colors for multi-series clouds        |
| `winLoss`   | Win/loss direction bars                                           |
| `bullet`    | Value vs. target with ranges                                      |
| `radar`     | Multi-axis spider chart                                           |
| `heatmap`   | Intensity grid — ragged rows, calendar month                      |
| `pictogram` | Countable unit blocks (shapes or emoji)                           |

Every chart has a matching React component (`LineChart`, `AreaChart`, …) — except
`lines`, which is core-only.
Full options for each are in the [API reference](docs/API.md#charts).

## Demo

Explore every chart live at the **[demo site](https://samirdamle.github.io/nano-charts/)** —
automatically redeployed on every push to `develop` or `main` that touches the demo, the core
package, or the deploy workflow.

To run it locally:

```sh
pnpm install  # once
pnpm dev:demo # builds core, then serves demo/ with live reload
```

## Packages

| Package                                                     | Description                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`@samirdamle/nano-charts`](packages/core/README.md) ([npm](https://www.npmjs.com/package/@samirdamle/nano-charts)) | Framework-agnostic core: `data → Scene` chart functions + a `toSVG` serializer. Zero runtime dependencies. |
| [`@samirdamle/nano-charts-react`](packages/react/README.md) ([npm](https://www.npmjs.com/package/@samirdamle/nano-charts-react)) | React components wrapping the core, with hover/click interactivity. |

Both are independently versioned and published (via [Changesets](https://github.com/changesets/changesets)).

## Docs

- [API reference](docs/API.md) — every chart's data shapes and options, the
  `Scene` model, `toSVG`, the React components, accessibility, and
  bundle-size positioning.

## Bundle size

Built for pages that render _hundreds_ of tiny charts, where per-chart byte
cost dominates. Zero runtime dependencies in core; React is a peer dependency
of the React package. Import one chart per subpath and ship only what you use.
Budgets are enforced in CI (`pnpm size`); all figures minified + Brotli,
measured 2026-09-26:

| Entry                                        | Budget  | Measured    |
| -------------------------------------------- | ------- | ----------- |
| Core — `line` standalone                     | 1.75 kB | **1.37 kB** |
| Core — `toSVG` standalone                    | 1 kB    | **887 B**   |
| Core — full barrel (all 12 charts + `toSVG`) | 9 kB    | **8.01 kB** |
| React — `LineChart` standalone               | 2.25 kB | **2.08 kB** |
| React — full barrel                          | 12 kB   | **7.97 kB** |

See [docs/API.md](docs/API.md#bundle-size) for per-chart sizes.

## Development

```sh
pnpm install
pnpm build      # builds every package
pnpm test       # tests every package
pnpm lint       # lints every package
pnpm typecheck  # typechecks every package
pnpm size       # checks bundle size budgets (.size-limit.json per package)
pnpm dev:demo   # builds core and serves demo/ locally with live reload
```

## Releasing

Versioning and publishing to npm go through [Changesets](https://github.com/changesets/changesets):

```sh
pnpm changeset          # record an intent-to-release for the packages you changed
pnpm version-packages   # apply changesets: bump versions, update changelogs
pnpm release            # lint + typecheck + test + build + size, then `changeset publish`
```

In practice this is automated: merging a changeset to `develop` makes the
[Release workflow](.github/workflows/release.yml) open a "Version Packages" PR, and merging
that PR publishes to npm. `pnpm release` above is the same gate run locally, for a manual
publish. Each package also runs the same checks (plus a build-output integrity check) as an
npm `prepublishOnly` hook, so a stray `npm publish` inside a package directory can't skip them.
Publishes are signed with [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
when run from CI.

## License

MIT © Samir Damle
