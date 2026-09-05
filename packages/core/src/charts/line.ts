import type { BaseOptions, Mark, Scene } from '../types';
import { toDasharray } from '../core/geometry';
import { type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { renderSeriesChart, singlePointDot } from '../core/series-chart';

export interface LineOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  dot?: 'none' | 'last' | 'all';
  strokeWidth?: number;
  dotRadius?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
}

export function line<T = number>(data: SeriesInput<T>, options: LineOptions<T> = {}): Scene {
  const strokeWidth = options.strokeWidth ?? 1;
  const dotRadius = options.dotRadius ?? 1;
  const strokeDasharray = toDasharray(options.strokeDasharray);

  return renderSeriesChart('line', data, options, (points, _layout, color) => {
    if (points.length < 2) {
      return [singlePointDot(points[0]!, Math.max(dotRadius, strokeWidth + 0.5), color, { index: 0 })];
    }

    const marks: Mark[] = [
      {
        type: 'polyline',
        points: points.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
        ...(strokeDasharray !== undefined ? { strokeDasharray } : {}),
        ...(options.strokeLinecap !== undefined ? { strokeLinecap: options.strokeLinecap } : {}),
      },
    ];
    if (options.dot && options.dot !== 'none') {
      const dottedIndices = options.dot === 'last' ? [points.length - 1] : points.map((_, i) => i);
      for (const i of dottedIndices) {
        const p = points[i]!;
        marks.push({ type: 'circle', cx: p.x, cy: p.y, r: dotRadius, fill: color, index: i });
      }
    }
    return marks;
  });
}
