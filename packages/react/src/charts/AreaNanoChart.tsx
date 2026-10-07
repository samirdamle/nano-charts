'use client';

import { area, type AreaOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface AreaNanoChartProps<T = number> extends AreaOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function AreaNanoChart<T = number>(props: AreaNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = area(data, options);
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
