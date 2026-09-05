# nano-charts

A monorepo for **tiny SVG charts** — sparklines, micro bars, donuts, bullets, scatter,
and heatmaps — the kind you repeat hundreds of times across table cells and metric
cards.

## Packages

| Package                                                     | Description                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`@samirdamle/nano-charts`](packages/core/README.md)        | Framework-agnostic core: `data → Scene` chart functions + a `toSVG` serializer. Zero runtime dependencies. |
| [`@samirdamle/nano-charts-react`](packages/react/README.md) | React components wrapping the core, with hover/click interactivity.                                        |

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
