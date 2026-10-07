'use client';

import { bullet, type BulletOptions, type BulletData } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface BulletNanoChartProps extends BulletOptions, InteractionProps {
  data: BulletData;
}

export function BulletNanoChart(props: BulletNanoChartProps) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = bullet(data, options);
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
