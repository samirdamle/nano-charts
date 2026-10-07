'use client';

import { radar, type RadarOptions, type RadarInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface RadarNanoChartProps<T = number> extends RadarOptions, InteractionProps {
  /** One series (shorthand) or an array of series to overlay. */
  series: RadarInput<T>;
}

export function RadarNanoChart<T = number>(props: RadarNanoChartProps<T>) {
  const { series, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const input: RadarInput<T> = series;
  const scene = radar(input, options);
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
