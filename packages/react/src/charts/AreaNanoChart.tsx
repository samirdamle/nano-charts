'use client';

import { area, type AreaOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface AreaNanoChartProps<T = number> extends AreaOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function AreaNanoChart<T = number>({ data, ...rest }: AreaNanoChartProps<T>): JSX.Element {
  return renderNanoChart(area, data, rest);
}
