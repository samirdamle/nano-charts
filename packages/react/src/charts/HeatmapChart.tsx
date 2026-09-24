'use client';

import { heatmap, type HeatmapOptions } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface HeatmapChartProps<T = number> extends HeatmapOptions<T>, InteractionProps {
  data: T[][];
}

export function HeatmapChart<T = number>(props: HeatmapChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = heatmap(data, options);
  return (
    <ChartSvg
      scene={scene}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      className={className}
      style={style}
      hitRadius={hitRadius}
    />
  );
}
