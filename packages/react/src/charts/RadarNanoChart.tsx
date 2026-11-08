'use client';

import { radar, type RadarOptions, type RadarInput } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface RadarNanoChartProps<T = number> extends RadarOptions, InteractionProps {
  /** One series (shorthand) or an array of series to overlay. */
  series?: RadarInput<T>;
  /** Alias for `series`, matching every other component's `data` prop. */
  data?: RadarInput<T>;
}

export function RadarNanoChart<T = number>({ series, data, ...rest }: RadarNanoChartProps<T>): JSX.Element {
  // The cast keeps the props honest at the boundary; renderNanoChart's
  // null/undefined guard renders the empty scene when both are absent.
  return renderNanoChart(radar, (series ?? data) as RadarInput<T>, rest);
}
