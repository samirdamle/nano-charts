'use client';

import { radar, type RadarOptions, type RadarInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface RadarNanoChartProps<T = number> extends RadarOptions, InteractionProps {
  /** One series (shorthand) or an array of series to overlay. */
  series: RadarInput<T>;
}

export function RadarNanoChart<T = number>({ series, ...rest }: RadarNanoChartProps<T>): JSX.Element {
  return renderNanoChart(radar, series, rest);
}
