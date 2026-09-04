'use client';

import {
  scatter,
  type ScatterOptions,
  type ScatterInput,
  type ScatterPoint,
} from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface ScatterChartProps<T = ScatterPoint> extends ScatterOptions<T>, InteractionProps {
  data: ScatterInput<T>;
}

export function ScatterChart<T = ScatterPoint>(props: ScatterChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = scatter(data, options);
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
