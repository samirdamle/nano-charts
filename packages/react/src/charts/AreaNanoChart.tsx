'use client';

import { area, type AreaOptions, type AreaPlots, type SeriesInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface AreaNanoChartProps<T = number> extends AreaOptions<T>, InteractionProps<AreaPlots> {
  data: SeriesInput<T>;
}

export function AreaNanoChart<T = number>({ data, ...rest }: AreaNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<SeriesInput<T>, AreaOptions<T>, AreaPlots>(area, data, rest);
}
