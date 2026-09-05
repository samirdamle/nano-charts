import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round, toDasharray } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { seriesLayout } from '../core/plot';
import { resolveChartShell, sceneShell, singlePointDot } from '../core/series-chart';

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
  const { width, height, color: defaultColor, padding } = resolveChartShell(options);

  const perSeries = series.map((s) => {
    const accessors = s.value ? { value: s.value, label: s.label, id: s.id } : undefined;
    return { input: s, datums: normalizeSeries(s.data, accessors) };
  });

  const count = perSeries.length ? Math.max(...perSeries.map((s) => s.datums.length)) : 0;
  const title = options.title ?? 'line chart';
  const desc = options.desc ?? `${title}, ${perSeries.length} series, up to ${count} points`;
  const base = sceneShell({ width, height }, { title, desc });

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
      marks.push(
        singlePointDot(seriesPoints[0]!, Math.max(dotRadius, strokeWidth + 0.5), color, {
          index: points.length,
          seriesIndex,
        }),
      );
    }

    points.push(...seriesPoints);
  });

  return { ...base, marks, points };
}
