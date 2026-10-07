'use client';

import { line, type LineOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface LineNanoChartProps<T = number> extends LineOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function LineNanoChart<T = number>(props: LineNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = line(data, options);
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
