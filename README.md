# nano-charts

A monorepo for **tiny SVG charts** — sparklines, micro bars, donuts, bullets, scatter,
and heatmaps — the kind you repeat hundreds of times across table cells and metric
cards.

## Charts

| Chart                              | What it's for                                       |
| ---------------------------------- | --------------------------------------------------- |
| `line`                             | Trend sparkline                                     |
| `area`                             | Filled trend                                        |
| `lines`                            | Multi-series overlay                                |
| `bar`                              | Magnitude bars — simple, stacked, grouped, or waterfall |
| `winLoss`                          | Direction / sign (wins vs. losses)                  |
| `bullet`                           | Value vs. target with ranges                        |
| `donut`                            | Proportion, full or partial dial                    |
| `gauge`                            | Dial gauge with arc/needle modes, zones, center label |
| `scatter`                          | 2D relationship                                     |
| `heatmap`                          | Intensity grid                                      |
| `radar`                            | Multi-axis spider chart                             |
| `pictogram`                        | Countable unit blocks                               |

Every chart has a matching React component (`LineChart`, `AreaChart`, …).
Full options for each are in the [API reference](docs/API.md#charts).

## Demo

Explore every chart live at the **[demo site](https://samirdamle.github.io/nano-charts/)** —
automatically redeployed on every push to `develop` that touches the demo, the core
package, or the deploy workflow.

To run it locally:

```sh
pnpm install  # once
pnpm dev:demo # builds core, then serves demo/ with live reload
```

## Packages

| Package                                                     | Description                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`@samirdamle/nano-charts`](packages/core/README.md)        | Framework-agnostic core: `data → Scene` chart functions + a `toSVG` serializer. Zero runtime dependencies. |
| [`@samirdamle/nano-charts-react`](packages/react/README.md) | React components wrapping the core, with hover/click interactivity.                                        |

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
