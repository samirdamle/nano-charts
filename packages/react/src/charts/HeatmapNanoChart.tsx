'use client';

import { heatmap, type HeatmapOptions, type HeatmapPlots } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface HeatmapNanoChartProps<T = number> extends HeatmapOptions<T>, InteractionProps<HeatmapPlots> {
  data: T[][];
}

export function HeatmapNanoChart<T = number>({ data, ...rest }: HeatmapNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<T[][], HeatmapOptions<T>, HeatmapPlots>(heatmap, data, rest);
}
