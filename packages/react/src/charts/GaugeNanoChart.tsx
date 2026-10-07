'use client';

import { gauge, type GaugeOptions, type GaugeInput } from '@samirdamle/nano-charts';
import { NanoChartSvg } from '../render/NanoChartSvg';
import type { InteractionProps } from '../types';

export interface GaugeNanoChartProps extends GaugeOptions, InteractionProps {
  data: GaugeInput;
}

export function GaugeNanoChart(props: GaugeNanoChartProps) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = gauge(data, options);
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
