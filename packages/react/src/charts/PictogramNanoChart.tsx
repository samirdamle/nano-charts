'use client';

import { pictogram, type PictogramInput, type PictogramOptions } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface PictogramNanoChartProps<T = number> extends PictogramOptions<T>, InteractionProps {
  /** One entry per column (vertical) or row (horizontal). */
  data: PictogramInput<T>;
}

export function PictogramNanoChart<T = number>({ data, ...rest }: PictogramNanoChartProps<T>): JSX.Element {
  return renderNanoChart(pictogram, data, rest);
}
