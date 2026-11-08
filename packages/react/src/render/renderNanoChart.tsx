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
/** The scene a component renders when its data prop is null/undefined:
 * an empty chart at the requested size, instead of an opaque TypeError
 * from inside a core chart function (validation finding F4). */
function emptyScene(options: {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
  class?: string;
}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks: [],
    points: [],
    a11y: { title: options.title ?? 'Chart', desc: options.desc ?? 'Chart, no data' },
    ...(options.class !== undefined ? { svgClass: options.class } : {}),
  };
}

export function renderNanoChart<D, O>(
  render: (data: D, options?: O) => Scene,
  data: D,
  props: O & InteractionProps,
): JSX.Element {
  const {
    onPointHover,
    onPointClick,
    onAnnotationHover,
    onAnnotationClick,
    className,
    style,
    hitRadius,
    ...options
  } = props;
  const scene =
    data == null
      ? emptyScene(options as { width?: number; height?: number; title?: string; desc?: string; class?: string })
      : render(data, options as O);
  return (
    <NanoChartSvg
      scene={scene}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      onAnnotationHover={onAnnotationHover}
      onAnnotationClick={onAnnotationClick}
      className={className}
      style={style}
      hitRadius={hitRadius}
    />
  );
}
