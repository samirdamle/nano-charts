import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface LineOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  dot?: 'none' | 'last' | 'all';
  strokeWidth?: number;
}

export function line<T = number>(data: SeriesInput<T>, options: LineOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const strokeWidth = options.strokeWidth ?? 1;
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('line', datums);
  const a11y = { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (datums.length === 0) return base;

  const layout = seriesLayout(datums.length, extent(datums.map((d) => d.value)), {
    width,
    height,
    padding,
  });

  const points: ScenePoint[] = datums.map((d) => ({
    id: d.id,
    label: d.label,
    value: d.value,
    index: d.index,
    x: round(layout.x(d.index)),
    y: round(layout.y(d.value)),
  }));

  const marks: Mark[] = [];

  if (points.length >= 2) {
    marks.push({
      type: 'polyline',
      points: points.map((p) => [p.x, p.y] as [number, number]),
      fill: 'none',
      stroke: color,
      strokeWidth,
    });
    if (options.dot && options.dot !== 'none') {
      const dotted = options.dot === 'last' ? points.slice(-1) : points;
      for (const p of dotted) marks.push({ type: 'circle', cx: p.x, cy: p.y, r: 1, fill: color });
    }
  } else {
    // A single point has no line to draw; render it as a dot so it's visible.
    const p = points[0]!;
    marks.push({ type: 'circle', cx: p.x, cy: p.y, r: Math.max(1, strokeWidth + 0.5), fill: color });
  }

  return { ...base, marks, points };
}
