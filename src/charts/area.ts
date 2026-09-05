import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface AreaOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  strokeWidth?: number;
  fillOpacity?: number;
  fillColor?: string;
}

export function area<T = number>(data: SeriesInput<T>, options: AreaOptions<T> = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const fillColor = options.fillColor ?? color;
  const strokeWidth = options.strokeWidth ?? 1;
  const fillOpacity = options.fillOpacity ?? 0.2;
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('area', datums);
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
    const bottom = round(layout.bottom);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const d =
      `M${first.x},${bottom} ` +
      points.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${last.x},${bottom} Z`;
    marks.push(
      { type: 'path', d, fill: fillColor, fillOpacity, stroke: 'none' },
      {
        type: 'polyline',
        points: points.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
      },
    );
  } else {
    // A single point has no area to fill; render it as a dot so it's visible.
    const p = points[0]!;
    marks.push({ type: 'circle', cx: p.x, cy: p.y, r: Math.max(1, strokeWidth + 0.5), fill: color });
  }

  return { ...base, marks, points };
}
