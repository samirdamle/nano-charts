'use client';

import { radar, type RadarOptions, type RadarInput, type RadarPlots } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface RadarNanoChartProps<T = number> extends RadarOptions, InteractionProps<RadarPlots> {
  /** One series (shorthand) or an array of series to overlay. */
  series?: RadarInput<T>;
  /** Alias for `series`, matching every other component's `data` prop. */
  data?: RadarInput<T>;
}

export function RadarNanoChart<T = number>({ series, data, ...rest }: RadarNanoChartProps<T>): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry T through
  // inference (it would resolve to `unknown`), so pin D and O here.
  // SeriesAccessors isn't exported from the core barrel, so O is RadarOptions
  // (the accessors are all optional, so the core signature still accepts it).
  return renderNanoChart<RadarInput<T>, RadarOptions, RadarPlots>(radar, (series ?? data) as RadarInput<T>, rest);
}
