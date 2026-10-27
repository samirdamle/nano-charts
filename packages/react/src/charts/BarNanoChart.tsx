'use client';

import { bar, type BarOptions, type BarInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface BarNanoChartProps<T = number> extends BarOptions<T>, InteractionProps {
  data: BarInput<T>;
}

export function BarNanoChart<T = number>({ data, ...rest }: BarNanoChartProps<T>): JSX.Element {
  return renderNanoChart(bar, data, rest);
}
