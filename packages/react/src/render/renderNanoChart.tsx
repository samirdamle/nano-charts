'use client';

import type { Scene } from '@samirdamle/nano-charts';
import { NanoChartSvg } from './NanoChartSvg';
import type { InteractionProps } from '../types';

/**
 * Shared body for the NanoChart wrapper components: renders the scene from
 * data + options and delegates to NanoChartSvg, peeling off the
 * interaction props. Each wrapper splits its own data prop first (`data`,
 * or `series` for radar).
 */
export function renderNanoChart<D, O>(
  render: (data: D, options?: O) => Scene,
  data: D,
  props: O & InteractionProps,
): JSX.Element {
  const { onPointHover, onPointClick, className, style, hitRadius, ...options } = props;
  const scene = render(data, options as O);
  return (
    <NanoChartSvg
      scene={scene}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      className={className}
      style={style}
      hitRadius={hitRadius}
    />
  );
}
