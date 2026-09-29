import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round, toDasharray } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { categoricalColor } from '../core/palette';
import {
  autoPlotPadding,
  seriesLayout,
  type ResolvedPadding,
  type SeriesLayout,
} from '../core/plot';
import { resolveChartShell, sceneShell, singlePointDot } from '../core/series-chart';
import { axisMarks, axisSpace, type AxisLayout, type AxisOptions } from '../core/axis';
import { highlightMarks, type HighlightZones } from '../core/highlight';

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

export interface LinesOptions extends BaseOptions {
  /** X axis (index-based). Disabled by default. */
  xAxis?: AxisOptions;
  /** Y axis (value-based). Disabled by default. */
  yAxis?: AxisOptions;
  /** Array of highlighted background regions, in data coordinates (x is
   * index-based, y is value-based). Clipped to the plot; purely
   * decorative — never affects padding. */
  highlights?: HighlightZones;
}

export function lines<T = number>(series: LineSeries<T>[], options: LinesOptions = {}): Scene {
  const { width, height, color: defaultColor } = resolveChartShell(options);
  // Precedence: explicit per-series color > uniform options.color (only if the
  // caller passed it) > categorical palette. Same rule donut() uses.
  const hasUniformColor = options.color !== undefined;

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

  const valueDomain = extent(allValues);
  const indexDomain: [number, number] = [0, count - 1];
  // Max half-size of a mark that can sit on the plot edge, across series.
  const extentPx = Math.max(
    0,
    ...perSeries.map(({ input, datums }) => {
      const sw = input.strokeWidth ?? 1;
      const dr = input.dotRadius ?? 1;
      return datums.length < 2
        ? Math.max(dr, sw + 0.5)
        : Math.max(sw / 2, input.dot && input.dot !== 'none' ? dr : 0);
    }),
  );
  const layoutFor = (padding: ResolvedPadding) =>
    seriesLayout(count, valueDomain, { width, height, padding });
  const axisLayoutFor = (l: SeriesLayout, orientation: 'x' | 'y'): AxisLayout =>
    orientation === 'x'
      ? {
          orientation,
          domain: indexDomain,
          scale: l.x,
          crossDomain: valueDomain,
          crossScale: l.y,
          span: [l.left, l.right],
          crossSpan: [l.top, l.bottom],
          integerTicks: true,
        }
      : {
          orientation,
          domain: valueDomain,
          scale: l.y,
          crossDomain: indexDomain,
          crossScale: l.x,
          span: [l.top, l.bottom],
          crossSpan: [l.left, l.right],
        };

  // Automatic padding, iterated to a fixed point on the real layout
  // (autoPlotPadding re-measures until the padding stops growing).
  const padding = autoPlotPadding(options.padding, extentPx, width, height, (p) => {
    const l = layoutFor(p);
    return {
      x: axisSpace(options.xAxis, axisLayoutFor(l, 'x')),
      y: axisSpace(options.yAxis, axisLayoutFor(l, 'y')),
    };
  });
  const layout = layoutFor(padding);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  perSeries.forEach(({ input, datums }, seriesIndex) => {
    const color =
      input.color ??
      (hasUniformColor ? defaultColor : categoricalColor(seriesIndex, perSeries.length));
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

  const xA = axisMarks(options.xAxis, axisLayoutFor(layout, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(layout, 'y'));
  const hl = highlightMarks(options.highlights, { x: layout.x, y: layout.y }, layout);

  return { ...base, marks: [...hl, ...xA.grid, ...yA.grid, ...marks, ...xA.axis, ...yA.axis], points };
}
