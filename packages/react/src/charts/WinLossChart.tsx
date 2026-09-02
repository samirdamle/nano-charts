'use client';

import { winLoss, type WinLossOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { ChartSvg } from '../render/ChartSvg';
import type { InteractionProps } from '../types';

export interface WinLossChartProps<T = number> extends WinLossOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function WinLossChart<T = number>(props: WinLossChartProps<T>) {
  const { data, onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = winLoss(data, options);
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
