'use client';

import { lines, type LinesOptions, type LineSeries } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface LinesNanoChartProps<T = number> extends LinesOptions, InteractionProps {
  data: LineSeries<T>[];
}

export function LinesNanoChart<T = number>({ data, ...rest }: LinesNanoChartProps<T>): JSX.Element {
  return renderNanoChart(lines, data, rest);
}
