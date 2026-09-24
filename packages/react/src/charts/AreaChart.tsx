'use client';

import { area, type AreaOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface AreaChartProps<T = number> extends AreaOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function AreaChart<T = number>(props: AreaChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = area(data, options);
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
