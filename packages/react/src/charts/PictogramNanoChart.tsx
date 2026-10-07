'use client';

import { pictogram, type PictogramInput, type PictogramOptions } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface PictogramNanoChartProps<T = number> extends PictogramOptions<T>, InteractionProps {
  /** One entry per column (vertical) or row (horizontal). */
  data: PictogramInput<T>;
}

export function PictogramNanoChart<T = number>(props: PictogramNanoChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = pictogram(data, options);
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
