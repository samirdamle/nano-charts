'use client';

import { bar, type BarOptions, type BarInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface BarNanoChartProps<T = number> extends BarOptions<T>, InteractionProps {
  data: BarInput<T>;
}

export function BarNanoChart<T = number>(props: BarNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = bar(data, options);
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
