'use client';

import { donut, type DonutOptions, type DonutInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface DonutNanoChartProps<T = number> extends DonutOptions<T>, InteractionProps {
  data: DonutInput<T>;
}

export function DonutNanoChart<T = number>(props: DonutNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = donut(data, options);
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
