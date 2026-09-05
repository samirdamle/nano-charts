import type { BaseOptions, Mark, Scene } from '../types';
import { round } from '../core/geometry';
import { type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { renderSeriesChart, singlePointDot } from '../core/series-chart';

export interface AreaOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  strokeWidth?: number;
  fillOpacity?: number;
}

export function area<T = number>(data: SeriesInput<T>, options: AreaOptions<T> = {}): Scene {
  const strokeWidth = options.strokeWidth ?? 1;
  const fillOpacity = options.fillOpacity ?? 0.2;

  return renderSeriesChart('area', data, options, (points, layout, color) => {
    if (points.length < 2) {
      return [singlePointDot(points[0]!, Math.max(1, strokeWidth + 0.5), color)];
    }

    const bottom = round(layout.bottom);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const d =
      `M${first.x},${bottom} ` +
      points.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${last.x},${bottom} Z`;
    const marks: Mark[] = [
      { type: 'path', d, fill: color, fillOpacity, stroke: 'none' },
      {
        type: 'polyline',
        points: points.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
      },
    ];
    return marks;
  });
}
