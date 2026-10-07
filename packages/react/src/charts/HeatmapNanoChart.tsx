'use client';

import { heatmap, type HeatmapOptions } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface HeatmapNanoChartProps<T = number> extends HeatmapOptions<T>, InteractionProps {
  data: T[][];
}

export function HeatmapNanoChart<T = number>(props: HeatmapNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = heatmap(data, options);
  return (
    <NanoChartSvg
      scene={scene}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      className={className}
      style={style}
      hitRadius={hitRadius}
    />
  );
}
