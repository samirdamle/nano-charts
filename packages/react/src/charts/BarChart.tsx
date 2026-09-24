'use client';

import { bar, type BarOptions, type BarInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface BarChartProps<T = number> extends BarOptions<T>, InteractionProps {
  data: BarInput<T>;
}

export function BarChart<T = number>(props: BarChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = bar(data, options);
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
