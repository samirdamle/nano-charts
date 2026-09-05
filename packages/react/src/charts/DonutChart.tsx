'use client';

import { donut, type DonutOptions, type DonutInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface DonutChartProps<T = number> extends DonutOptions<T>, InteractionProps {
  data: DonutInput<T>;
}

export function DonutChart<T = number>(props: DonutChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = donut(data, options);
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
