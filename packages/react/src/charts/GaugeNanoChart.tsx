'use client';

import { gauge, type GaugeOptions, type GaugeInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface GaugeNanoChartProps extends GaugeOptions, InteractionProps {
  data: GaugeInput;
}

export function GaugeNanoChart({ data, ...rest }: GaugeNanoChartProps): JSX.Element {
  return renderNanoChart(gauge, data, rest);
}
