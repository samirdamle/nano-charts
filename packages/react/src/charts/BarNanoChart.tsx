'use client';

import { bar, type BarOptions, type BarInput, type BarPlots } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface BarNanoChartProps<T = number> extends BarOptions<T>, InteractionProps<BarPlots> {
  data: BarInput<T>;
}

export function BarNanoChart<T = number>({ data, ...rest }: BarNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<BarInput<T>, BarOptions<T>, BarPlots>(bar, data, rest);
}
