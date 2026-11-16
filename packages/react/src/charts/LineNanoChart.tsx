'use client';

import { line, type LineOptions, type LinePlots, type SeriesInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface LineNanoChartProps<T = number> extends LineOptions<T>, InteractionProps<LinePlots> {
  data: SeriesInput<T>;
}

export function LineNanoChart<T = number>({ data, ...rest }: LineNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<SeriesInput<T>, LineOptions<T>, LinePlots>(line, data, rest);
}
