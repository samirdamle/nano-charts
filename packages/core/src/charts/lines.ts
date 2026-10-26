import type {
  AnnotationOptions,
  BaseOptions,
  Mark,
  ReferenceLineOptions,
  Scene,
  ScenePoint,
} from '../types';
import { extent, round, toDasharray } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolveSegmentColor } from '../core/palette';
import {
  autoPlotPadding,
  seriesLayout,
  type ResolvedPadding,
  type SeriesLayout,
} from '../core/plot';
import { lineMarkExtent, resolveChartShell, sceneShell, singlePointDot } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import { axisLayout, axisMarks, axisSpace, layerMarks, type AxisLayout, type AxisOptions } from '../core/axis';
import { highlightMarks, type HighlightZones } from '../core/highlight';
import {
  annotationMarks,
  indexAnnotationMapper,
  referenceLineMarks,
  seriesAwareMapper,
} from '../core/annotations';

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

export interface LinesOptions extends BaseOptions, AnnotationOptions, ReferenceLineOptions {
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
  const base = sceneShell({ width, height }, { title, desc }, options);

  const allValues = perSeries.flatMap((s) => s.datums.map((d) => d.value));
  if (allValues.length === 0) return base;

  const valueDomain = extent(allValues);
  const indexDomain: [number, number] = [0, count - 1];
  // Max half-size of a mark that can sit on the plot edge, across series.
  const extentPx = Math.max(
    0,
    ...perSeries.map(({ input, datums }) =>
      lineMarkExtent(datums.length, input.strokeWidth ?? 1, input.dotRadius ?? 1, input.dot),
    ),
  );
  const layoutFor = (padding: ResolvedPadding) =>
    seriesLayout(count, valueDomain, { width, height, padding });
  const axisLayoutFor = (l: SeriesLayout, orientation: 'x' | 'y'): AxisLayout =>
    axisLayout(orientation, {
      domain: indexDomain,
      scale: l.x,
      crossDomain: valueDomain,
      crossScale: l.y,
      span: [l.left, l.right],
      crossSpan: [l.top, l.bottom],
      integerTicks: orientation === 'x' ? true : undefined,
    });

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
  const seriesColors: string[] = [];

  perSeries.forEach(({ input, datums }, seriesIndex) => {
    const color = resolveSegmentColor({
      explicit: input.color,
      uniform: defaultColor,
      usePalette: !hasUniformColor,
      paletteIndex: seriesIndex,
      paletteTotal: perSeries.length,
    });
    seriesColors.push(color);
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
      seriesLabel: input.name,
    }));

    if (seriesPoints.length >= 2) {
      marks.push({
        type: 'polyline',
        class: markClass('line', undefined, seriesIndex),
        points: seriesPoints.map((p) => [p.x, p.y] as [number, number]),
        fill: 'none',
        stroke: color,
        strokeWidth,
        strokeDasharray,
        strokeLinecap: input.strokeLinecap,
      });
      if (input.dot && input.dot !== 'none') {
        const dottedIndices =
          input.dot === 'last' ? [seriesPoints.length - 1] : seriesPoints.map((_, i) => i);
        for (const i of dottedIndices) {
          const p = seriesPoints[i]!;
          marks.push({
            type: 'circle',
            class: markClass('point', points.length + i, seriesIndex),
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
          class: markClass('point', points.length, seriesIndex),
        }),
      );
    }

    points.push(...seriesPoints);
  });

  const xA = axisMarks(options.xAxis, axisLayoutFor(layout, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(layout, 'y'));
  const hl = highlightMarks(options.highlights, { x: layout.x, y: layout.y }, layout);
  // Annotations sit on top of everything, including axis furniture. The
  // shared domain spans all series, so series targeting (v2) colors an
  // annotation by its series but never moves it. Reference lines sit just
  // below the annotations.
  const referenceLines = referenceLineMarks(
    options.referenceLines,
    {
      horizontal: (v) => (v >= valueDomain[0] && v <= valueDomain[1] ? layout.y(v) : null),
      vertical: (v) => (v >= 0 && v <= count - 1 ? layout.x(v) : null),
      box: layout,
    },
    defaultColor,
  );
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(
      indexAnnotationMapper(count, valueDomain, layout),
      perSeries.length,
      (si) => seriesColors[si],
    ),
    defaultColor,
  );

  return {
    ...base,
    marks: [...layerMarks(hl, xA, yA, marks), ...referenceLines, ...annMarks],
    points,
    ...(annotationPoints.length > 0 ? { annotationPoints } : {}),
  };
}
