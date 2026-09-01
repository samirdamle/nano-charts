import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import { resolvePadding } from '../core/plot';

export interface ScatterPoint {
  id?: string | number;
  label?: string;
  x: number;
  y: number;
}

export interface ScatterAccessors<T> {
  x: (row: T, i: number) => number;
  y: (row: T, i: number) => number;
  label?: (row: T, i: number) => string;
  id?: (row: T, i: number) => string | number;
}

// ScatterPoint is just the default T; keeping it out of the union lets TS infer T
// cleanly from accessor-form object arrays (otherwise excess-property checks fire).
export type ScatterInput<T = ScatterPoint> = [number, number][] | T[];

export interface ScatterOptions<T = ScatterPoint>
  extends BaseOptions,
    Partial<ScatterAccessors<T>> {
  radius?: number;
}

interface XY {
  id: string | number;
  label: string;
  x: number;
  y: number;
  index: number;
}

function toXY<T>(data: ScatterInput<T>, options: ScatterOptions<T>): XY[] {
  if (data.length === 0) return [];
  if (options.x && options.y) {
    const { x, y, label, id } = options;
    return (data as T[]).map((row, i) => ({
      id: id ? id(row, i) : i,
      label: label ? label(row, i) : `${x(row, i)}, ${y(row, i)}`,
      x: x(row, i),
      y: y(row, i),
      index: i,
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
  const padding = resolvePadding(options.padding);
  const pts = toXY(data, options);

  const a11y = {
    title: options.title ?? 'scatter chart',
    desc:
      options.desc ??
      (pts.length === 0 ? 'scatter chart, no data' : `scatter chart, ${pts.length} points`),
  };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (pts.length === 0) return base;

  const xScale = linearScale(extent(pts.map((p) => p.x)), [padding.left, width - padding.right]);
  const yScale = linearScale(extent(pts.map((p) => p.y)), [height - padding.bottom, padding.top]);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  for (const p of pts) {
    const cx = round(xScale(p.x));
    const cy = round(yScale(p.y));
    marks.push({ type: 'circle', cx, cy, r: radius, fill: color });
    points.push({ id: p.id, label: p.label, value: p.y, index: p.index, x: cx, y: cy });
  }
  return { ...base, marks, points };
}
