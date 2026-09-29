import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import {
  autoPlotPadding,
  paddedBox,
  type PaddedBox,
  type ResolvedPadding,
} from '../core/plot';
import { axisMarks, axisSpace, type AxisLayout, type AxisOptions } from '../core/axis';
import { highlightMarks, type HighlightOption } from '../core/highlight';

export interface ScatterPoint {
  id?: string | number;
  label?: string;
  x: number;
  y: number;
  /** Per-point fill. Falls back to the chart's `color` option when omitted. */
  color?: string;
}

export interface ScatterAccessors<T> {
  x: (row: T, i: number) => number;
  y: (row: T, i: number) => number;
  label?: (row: T, i: number) => string;
  id?: (row: T, i: number) => string | number;
  colorAccessor?: (row: T, i: number) => string | undefined;
}

// ScatterPoint is just the default T; keeping it out of the union lets TS infer T
// cleanly from accessor-form object arrays (otherwise excess-property checks fire).
export type ScatterInput<T = ScatterPoint> = [number, number][] | T[];

export interface ScatterOptions<T = ScatterPoint>
  extends BaseOptions, Partial<ScatterAccessors<T>> {
  radius?: number;
  /** X axis. Disabled by default. */
  xAxis?: AxisOptions;
  /** Y axis. Disabled by default. */
  yAxis?: AxisOptions;
  /** Highlighted background region(s), in data coordinates. Clipped to
   * the plot; purely decorative — never affects padding. */
  highlight?: HighlightOption;
}

interface XY {
  id: string | number;
  label: string;
  x: number;
  y: number;
  index: number;
  color?: string;
}

function toXY<T>(data: ScatterInput<T>, options: ScatterOptions<T>): XY[] {
  if (data.length === 0) return [];
  if (options.x && options.y) {
    const { x, y, label, id, colorAccessor } = options;
    return (data as T[]).map((row, i) => ({
      id: id ? id(row, i) : i,
      label: label ? label(row, i) : `${x(row, i)}, ${y(row, i)}`,
      x: x(row, i),
      y: y(row, i),
      index: i,
      color: colorAccessor ? colorAccessor(row, i) : undefined,
    }));
  }
  if (Array.isArray(data[0])) {
    return (data as [number, number][]).map(([x, y], i) => ({
      id: i,
      label: `${x}, ${y}`,
      x,
      y,
      index: i,
    }));
  }
  return (data as ScatterPoint[]).map((p, i) => ({
    id: p.id ?? i,
    label: p.label ?? `${p.x}, ${p.y}`,
    x: p.x,
    y: p.y,
    index: i,
    color: p.color,
  }));
}

export function scatter<T = ScatterPoint>(
  data: ScatterInput<T>,
  options: ScatterOptions<T> = {},
): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const radius = options.radius ?? 1;
  const pts = toXY(data, options);

  const a11y = {
    title: options.title ?? 'scatter chart',
    desc:
      options.desc ??
      (pts.length === 0 ? 'scatter chart, no data' : `scatter chart, ${pts.length} points`),
  };
  const base: Scene = {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks: [],
    points: [],
    a11y,
  };
  if (pts.length === 0) return base;

  const xDomain = extent(pts.map((p) => p.x));
  const yDomain = extent(pts.map((p) => p.y));
  const boxFor = (padding: ResolvedPadding): PaddedBox => paddedBox({ width, height, padding });
  const scalesFor = (b: PaddedBox) => ({
    x: linearScale(xDomain, [b.left, b.right]),
    y: linearScale(yDomain, [b.bottom, b.top]),
  });
  const axisLayoutFor = (
    b: PaddedBox,
    s: { x: (v: number) => number; y: (v: number) => number },
    orientation: 'x' | 'y',
  ): AxisLayout =>
    orientation === 'x'
      ? {
          orientation,
          domain: xDomain,
          scale: s.x,
          crossDomain: yDomain,
          crossScale: s.y,
          span: [b.left, b.right],
          crossSpan: [b.top, b.bottom],
        }
      : {
          orientation,
          domain: yDomain,
          scale: s.y,
          crossDomain: xDomain,
          crossScale: s.x,
          span: [b.top, b.bottom],
          crossSpan: [b.left, b.right],
        };

  // Automatic padding, iterated to a fixed point on the real layout.
  const padding = autoPlotPadding(options.padding, radius, width, height, (p) => {
    const b = boxFor(p);
    const s = scalesFor(b);
    return {
      x: axisSpace(options.xAxis, axisLayoutFor(b, s, 'x')),
      y: axisSpace(options.yAxis, axisLayoutFor(b, s, 'y')),
    };
  });
  const box = boxFor(padding);
  const xScale = linearScale(xDomain, [box.left, box.right]);
  const yScale = linearScale(yDomain, [box.bottom, box.top]);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  for (const p of pts) {
    const cx = round(xScale(p.x));
    const cy = round(yScale(p.y));
    marks.push({ type: 'circle', cx, cy, r: radius, fill: p.color ?? color });
    points.push({ id: p.id, label: p.label, value: p.y, index: p.index, x: cx, y: cy });
  }

  const xA = axisMarks(options.xAxis, axisLayoutFor(box, { x: xScale, y: yScale }, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(box, { x: xScale, y: yScale }, 'y'));
  const hl = highlightMarks(options.highlight, { x: xScale, y: yScale }, box);

  return { ...base, marks: [...hl, ...xA.grid, ...yA.grid, ...marks, ...xA.axis, ...yA.axis], points };
}
