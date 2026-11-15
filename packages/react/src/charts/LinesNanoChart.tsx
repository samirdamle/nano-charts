'use client';

import { lines, type LinesOptions, type LineSeries } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface LinesNanoChartProps<T = number> extends LinesOptions, InteractionProps {
  data: LineSeries<T>[];
}

export function LinesNanoChart<T = number>({ data, ...rest }: LinesNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<LineSeries<T>[], LinesOptions>(lines, data, rest);
}
