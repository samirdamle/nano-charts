'use client';

import { winLoss, type WinLossOptions, type SeriesInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface WinLossNanoChartProps<T = number> extends WinLossOptions<T>, InteractionProps {
  data: SeriesInput<T>;
}

export function WinLossNanoChart<T = number>({ data, ...rest }: WinLossNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<SeriesInput<T>, WinLossOptions<T>>(winLoss, data, rest);
}
