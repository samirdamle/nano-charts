'use client';

import { radar, type RadarOptions, type RadarInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface RadarChartProps<T = number> extends RadarOptions, InteractionProps {
  /** One series (shorthand) or an array of series to overlay. */
  series: RadarInput<T>;
}

export function RadarChart<T = number>(props: RadarChartProps<T>) {
  const { series, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const input: RadarInput<T> = series;
  const scene = radar(input, options);
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
