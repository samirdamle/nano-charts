'use client';

import { pictogram, type PictogramInput, type PictogramOptions } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface PictogramChartProps<T = number> extends PictogramOptions<T>, InteractionProps {
  /** One entry per column (vertical) or row (horizontal). */
  data: PictogramInput<T>;
}

export function PictogramChart<T = number>(props: PictogramChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = pictogram(data, options);
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
