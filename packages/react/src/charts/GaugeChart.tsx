'use client';

import { gauge, type GaugeOptions, type GaugeInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface GaugeChartProps extends GaugeOptions, InteractionProps {
  data: GaugeInput;
}

export function GaugeChart(props: GaugeChartProps) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = gauge(data, options);
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
