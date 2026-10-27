import type { Mark, Scene } from '../types';
import { splinePath, toDasharray } from '../core/geometry';
import { type SeriesInput } from '../core/normalize';
import { lineMarkExtent, renderSeriesChart, type SeriesChartOptions, singlePointDot } from '../core/series-chart';
import { markClass } from '../core/css-classes';

export interface LineOptions<T = number> extends SeriesChartOptions<T> {
  /** 'linear' draws straight segments (default); 'spline' draws a smooth curve through the points. */
  mode?: 'linear' | 'spline';
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
  const spline = options.mode === 'spline';

  return renderSeriesChart(
    'line',
    data,
    options,
    (points, _layout, color) => {
      if (points.length < 2) {
        return [
          singlePointDot(points[0]!, Math.max(dotRadius, strokeWidth + 0.5), color, {
            index: 0,
            class: markClass('point', 0),
          }),
        ];
      }

      const pts = points.map((p) => [p.x, p.y] as [number, number]);
      const lineMark: Mark = spline
        ? {
            type: 'path',
            class: markClass('line'),
            d: splinePath(pts),
            fill: 'none',
            stroke: color,
            strokeWidth,
            strokeDasharray,
            strokeLinecap: options.strokeLinecap,
          }
        : {
            type: 'polyline',
            class: markClass('line'),
            points: pts,
            fill: 'none',
            stroke: color,
            strokeWidth,
            strokeDasharray,
            strokeLinecap: options.strokeLinecap,
          };
      const marks: Mark[] = [lineMark];
      if (options.dot && options.dot !== 'none') {
        const dottedIndices =
          options.dot === 'last' ? [points.length - 1] : points.map((_, i) => i);
        for (const i of dottedIndices) {
          const p = points[i]!;
          marks.push({
            type: 'circle',
            class: markClass('point', i),
            cx: p.x,
            cy: p.y,
            r: dotRadius,
            fill: color,
            index: i,
          });
        }
      }
      return marks;
    },
    (n) => lineMarkExtent(n, strokeWidth, dotRadius, options.dot),
  );
}
