'use client';

import { donut, type DonutOptions, type DonutInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface DonutNanoChartProps<T = number> extends DonutOptions<T>, InteractionProps {
  data: DonutInput<T>;
}

export function DonutNanoChart<T = number>({ data, ...rest }: DonutNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<DonutInput<T>, DonutOptions<T>>(donut, data, rest);
}
