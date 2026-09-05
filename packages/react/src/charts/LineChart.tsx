'use client';

import { line, type LineOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface LineChartProps<T = number> extends LineOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function LineChart<T = number>(props: LineChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = line(data, options);
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
