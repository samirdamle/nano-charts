'use client';

import { pictogram, type PictogramInput, type PictogramOptions, type PictogramPlots } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface PictogramNanoChartProps<T = number> extends PictogramOptions<T>, InteractionProps<PictogramPlots> {
  /** One entry per column (vertical) or row (horizontal). */
  data: PictogramInput<T>;
}

export function PictogramNanoChart<T = number>({ data, ...rest }: PictogramNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  return renderNanoChart<PictogramInput<T>, PictogramOptions<T>, PictogramPlots>(pictogram, data, rest);
}
