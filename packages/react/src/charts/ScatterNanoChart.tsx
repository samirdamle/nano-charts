'use client';

import { scatter, type ScatterOptions, type ScatterInput, type ScatterPoint } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface ScatterNanoChartProps<T = ScatterPoint> extends ScatterOptions<T>, InteractionProps {
  data: ScatterInput<T>;
}

export function ScatterNanoChart<T = ScatterPoint>({ data, ...rest }: ScatterNanoChartProps<T>): JSX.Element {
  return renderNanoChart(scatter, data, rest);
}
