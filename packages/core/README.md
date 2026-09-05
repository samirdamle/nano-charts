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
Rendered dot circles also carry `data-index`/`data-series` attributes in the `toSVG`
output, so hit-testing a specific point no longer requires reverse-mapping coordinates —
the DOM node names its own point index.

## Charts

| Function | Encodes | Data |
|----------|---------|------|
| `line` / `area` | trend | `number[]`, `{id,label,value}[]`, or accessors |
| `lines` | multi-series trend overlay | `LineSeries[]` — each series is `{ data, name?, color?, strokeWidth?, strokeDasharray?, strokeLinecap?, dot?, dotRadius? }` |
| `bar` | magnitude (simple or **stacked**) | series, or nested arrays for stacks |
| `winLoss` | direction/sign | series |
| `bullet` | value vs target | `{ value, target, ranges? }` |
| `donut` | proportion | `{ value, max }` (gauge) or segments |
| `scatter` | 2D relationship | `[x,y][]`, `{x,y}[]`, or accessors |
| `heatmap` | intensity grid | `number[][]` (+ `colorScale`) |

## License

MIT © Samir Damle
