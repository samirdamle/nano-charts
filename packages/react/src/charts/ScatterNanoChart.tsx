'use client';

import {
  scatter,
  type ScatterOptions,
  type ScatterInput,
  type ScatterPoint,
} from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface ScatterNanoChartProps<T = ScatterPoint> extends ScatterOptions<T>, InteractionProps {
  data: ScatterInput<T>;
}

export function ScatterNanoChart<T = ScatterPoint>(props: ScatterNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = scatter(data, options);
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
