import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round, toDasharray } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding, seriesLayout } from '../core/plot';

export interface LineSeries<T = number> extends Partial<SeriesAccessors<T>> {
  data: SeriesInput<T>;
  /** Series display name, carried onto its points as `seriesLabel`. */
  name?: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  dot?: 'none' | 'last' | 'all';
  dotRadius?: number;
}

export type LinesOptions = BaseOptions;

export function lines<T = number>(series: LineSeries<T>[], options: LinesOptions = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const defaultColor = options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);

  const perSeries = series.map((s) => {
    const accessors = s.value ? { value: s.value, label: s.label, id: s.id } : undefined;
    return { input: s, datums: normalizeSeries(s.data, accessors) };
  });

  const count = perSeries.length ? Math.max(...perSeries.map((s) => s.datums.length)) : 0;
  const title = options.title ?? 'line chart';
  const desc = options.desc ?? `${title}, ${perSeries.length} series, up to ${count} points`;
  const a11y = { title, desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };

  const allValues = perSeries.flatMap((s) => s.datums.map((d) => d.value));
  if (allValues.length === 0) return base;

  const layout = seriesLayout(count, extent(allValues), { width, height, padding });

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  perSeries.forEach(({ input, datums }, seriesIndex) => {
    const color = input.color ?? defaultColor;
    const strokeWidth = input.strokeWidth ?? 1;
    const dotRadius = input.dotRadius ?? 1;
    const strokeDasharray = toDasharray(input.strokeDasharray);

    const seriesPoints: ScenePoint[] = datums.map((d) => ({
      id: d.id,
      label: d.label,
      value: d.value,
      index: d.index,
      x: round(layout.x(d.index)),
      y: round(layout.y(d.value)),
      seriesIndex,
      ...(input.name !== undefined ? { seriesLabel: input.name } : {}),
    }));

    if (seriesPoints.length >= 2) {
      marks.push({
        type: 'polyline',
        points: seriesPoints.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
        ...(strokeDasharray !== undefined ? { strokeDasharray } : {}),
        ...(input.strokeLinecap !== undefined ? { strokeLinecap: input.strokeLinecap } : {}),
      });
      if (input.dot && input.dot !== 'none') {
        const dottedIndices =
          input.dot === 'last' ? [seriesPoints.length - 1] : seriesPoints.map((_, i) => i);
        for (const i of dottedIndices) {
          const p = seriesPoints[i]!;
          marks.push({
            type: 'circle',
            cx: p.x,
            cy: p.y,
            r: dotRadius,
            fill: color,
            index: points.length + i,
            seriesIndex,
          });
        }
      }
    } else if (seriesPoints.length === 1) {
      // A lone point in a series has no line to draw; render it as a dot so it's visible.
      const p = seriesPoints[0]!;
      marks.push({
        type: 'circle',
        cx: p.x,
        cy: p.y,
        r: Math.max(dotRadius, strokeWidth + 0.5),
        fill: color,
        index: points.length,
        seriesIndex,
      });
    }

    points.push(...seriesPoints);
  });

  return { ...base, marks, points };
}
