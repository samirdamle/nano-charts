'use client';

import { scatter, type ScatterOptions, type ScatterInput, type ScatterPlots, type ScatterPoint } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface ScatterNanoChartProps<T = ScatterPoint> extends ScatterOptions<T>, InteractionProps<ScatterPlots> {
  data: ScatterInput<T>;
}

export function ScatterNanoChart<T = ScatterPoint>({ data, ...rest }: ScatterNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<ScatterInput<T>, ScatterOptions<T>, ScatterPlots>(scatter, data, rest);
}
