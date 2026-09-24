'use client';

import { bullet, type BulletOptions, type BulletData } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface BulletChartProps extends BulletOptions, InteractionProps {
  data: BulletData;
}

export function BulletChart(props: BulletChartProps) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = bullet(data, options);
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
