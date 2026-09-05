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
    <LineChart data={[4, 9, 2, 7, 5]} dot="last" onPointHover={(point) => console.log(point)} />
  );
}
```

Every component takes the same `data` and options as its
[`@samirdamle/nano-charts`](../core/README.md) function counterpart, plus:

| Prop                  | Type                                  | Description                                                                                             |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `onPointHover`        | `(point: ScenePoint \| null) => void` | Fires on hover enter with the point, and on leave with `null`.                                          |
| `onPointClick`        | `(point: ScenePoint) => void`         | Fires on click with the point.                                                                          |
| `hitRadius`           | `number` (default `4`)                | Radius of the invisible hover/click target around each point, in the chart's internal coordinate space. |
| `className` / `style` | standard React props                  | Passed to the root `<svg>`.                                                                             |

No tooltip UI ships with this package — build your own from the callback data.

Works with Next.js App Router (`'use client'` is set on every component) and any
other React 17+ setup.

## Components

`LineChart`, `AreaChart`, `BarChart`, `WinLossChart`, `BulletChart`, `DonutChart`,
`ScatterChart`, `HeatmapChart` — also available as subpath imports for the smallest
bundle, e.g. `import { BarChart } from '@samirdamle/nano-charts-react/bar'`.

## License

MIT © Samir Damle
