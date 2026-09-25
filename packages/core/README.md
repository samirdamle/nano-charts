# @samirdamle/nano-charts

Extremely lightweight, zero-dependency TypeScript library for **tiny SVG charts** —
sparklines, micro bars, donuts, bullets, scatter, and heatmaps — the kind you repeat
hundreds of times across table cells and metric cards.

- **9 kB** minified for all 12 charts — zero runtime dependencies, pure JS + SVG.
- Framework-agnostic **scene model** core (`data → Scene`) + a `toSVG` serializer.
- SSR-safe & deterministic. Inherits text color via `currentColor`. Accessible by default.
- Hover and click events; customizable and theme-able.
- React wrapper: [`@samirdamle/nano-charts-react`](https://www.npmjs.com/package/@samirdamle/nano-charts-react).
- MIT licensed.

**[Live demo](https://samirdamle.github.io/nano-charts/)** ·
[GitHub](https://github.com/samirdamle/nano-charts) ·
[API reference](https://github.com/samirdamle/nano-charts/blob/develop/docs/API.md)

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

**Full API reference:** [docs/API.md](https://github.com/samirdamle/nano-charts/blob/develop/docs/API.md) —
every chart's data shapes and options, the `Scene` model, `toSVG`, and
bundle-size positioning.

## Charts

| Function | Encodes | Data |
|----------|---------|------|
| `line` | trend — straight or smooth spline | `number[]`, `{id,label,value}[]`, or accessors |
| `lines` | multi-series trend overlay | `LineSeries[]` — each series is `{ data, name?, color?, strokeWidth?, strokeDasharray?, strokeLinecap?, dot?, dotRadius? }` |
| `area` | filled trend | same shapes as `line` |
| `bar` | magnitude — simple, stacked, or grouped | series, or nested arrays for stacks/groups |
| `donut` | proportion — full or partial dial | `{ value, max }` (gauge) or segments |
| `gauge` | dial gauge — arc/needle, zones | `{ value, max }` |
| `scatter` | 2D relationship — per-point colors | `[x,y][]`, `{x,y}[]` (+ `color`), or accessors |
| `winLoss` | direction/sign | series |
| `bullet` | value vs target | `{ value, target, ranges? }` |
| `radar` | multi-axis spider | `number[]` (one value per axis) |
| `heatmap` | intensity grid | `number[][]` (+ `colorScale`) |
| `pictogram` | countable unit blocks | counts (`number[]`) |

## License

MIT © Samir Damle
