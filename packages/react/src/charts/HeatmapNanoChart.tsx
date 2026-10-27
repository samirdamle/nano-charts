'use client';

import { heatmap, type HeatmapOptions } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface HeatmapNanoChartProps<T = number> extends HeatmapOptions<T>, InteractionProps {
  data: T[][];
}

export function HeatmapNanoChart<T = number>({ data, ...rest }: HeatmapNanoChartProps<T>): JSX.Element {
  return renderNanoChart(heatmap, data, rest);
}
