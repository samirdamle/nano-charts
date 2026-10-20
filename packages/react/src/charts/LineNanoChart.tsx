'use client';

import { line, type LineOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface LineNanoChartProps<T = number> extends LineOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function LineNanoChart<T = number>({ data, ...rest }: LineNanoChartProps<T>): JSX.Element {
  return renderNanoChart(line, data, rest);
}
