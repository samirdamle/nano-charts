import type {
  AnnotationOptions,
  AreaPlots,
  BaseOptions,
  Datum,
  LinePlots,
  Mark,
  PlotFrame,
  PlotsPoint,
  ReferenceLineOptions,
  Scene,
  ScenePoint,
} from '../types';
import { extent, round, round3 } from './geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from './normalize';
import {
  autoPlotPadding,
  paddedBox,
  resolvePadding,
  seriesLayout,
  type PaddedBox,
  type ResolvedPadding,
  type SeriesLayout,
} from './plot';
import { seriesSummary } from './a11y';
import { axisLayout, axisMarks, axisSpace, layerMarks, type AxisLayout, type AxisOptions } from './axis';
import { highlightMarks, type HighlightZones } from './highlight';
import {
  annotationMarks,
  indexAnnotationMapper,
  indexRefLineScales,
  referenceLineMarks,
  seriesAwareMapper,
} from './annotations';
import { finishScene } from './scene';

type CircleMark = Extract<Mark, { type: 'circle' }>;

export interface ChartShell {
  width: number;
  height: number;
  color: string;
  padding: ResolvedPadding;
}

/** Resolves the width/height/color/padding defaults every chart shares. */
export function resolveChartShell(options: BaseOptions): ChartShell {
  return {
    width: options.width ?? 100,
    height: options.height ?? 20,
    color: options.color ?? 'currentColor',
    padding: resolvePadding(options.padding),
  };
}

/**
 * Max half-size of a line-chart mark that can sit on the plot edge: a lone
 * point renders as a dot, otherwise the stroke (or dots) set the extent.
 * Shared by line() and lines() for their auto-padding probe.
 */
export function lineMarkExtent(
  pointCount: number,
  strokeWidth: number,
  dotRadius: number,
  dot?: 'none' | 'last' | 'all',
): number {
  return pointCount < 2
    ? Math.max(dotRadius, strokeWidth + 0.5)
    : Math.max(strokeWidth / 2, dot && dot !== 'none' ? dotRadius : 0);
}

/** Resolves the a11y title/desc, falling back to the series summary. */
export function resolveA11y(
  kind: string,
  datums: Datum[],
  options: { title?: string; desc?: string },
): { title: string; desc: string } {
  const summary = seriesSummary(kind, datums);
  return { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
}

/** Builds the empty-marks Scene shell every chart starts from. */
export function sceneShell(
  shell: { width: number; height: number },
  a11y: { title: string; desc: string },
  options?: Pick<BaseOptions, 'class'>,
): Scene {
  return {
    width: shell.width,
    height: shell.height,
    viewBox: `0 0 ${shell.width} ${shell.height}`,
    marks: [],
    points: [],
    a11y,
    svgClass: options?.class,
  };
}

export interface SeriesChartOptions<T>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    AnnotationOptions,
    ReferenceLineOptions {
  /** X axis (index-based). Disabled by default. */
  xAxis?: AxisOptions;
  /** Y axis (value-based). Disabled by default. */
  yAxis?: AxisOptions;
  /** Array of highlighted background regions, in data coordinates (x is
   * index-based, y is value-based). Clipped to the plot; purely
   * decorative — never affects padding. */
  highlights?: HighlightZones;
}

/** Builds one series' plots points with geometry rounded to 3 decimals —
 * unlike the 2dp-rounded ScenePoints the marks are drawn from. `value` is
 * the raw datum and stays exact. `color` is the series color the marks
 * render with. */
export function seriesPlotsPoints(
  datums: Datum[],
  layout: SeriesLayout,
  color: string,
  seriesIndex: number,
): PlotsPoint[] {
  return datums.map((d) => ({
    x: round3(layout.x(d.index)),
    y: round3(layout.y(d.value)),
    value: d.value,
    index: d.index,
    seriesIndex,
    color,
  }));
}

/** The frame for a plots payload: chart size, plot box, and data domains.
 * Takes the plot box, not the full layout — `SeriesLayout` extends
 * `PaddedBox`, so series charts pass their layout and other charts (e.g.
 * scatter) pass their box. */
export function seriesPlotsFrame(
  width: number,
  height: number,
  box: PaddedBox,
  xDomain: [number, number],
  yDomain: [number, number],
): PlotFrame {
  return {
    width,
    height,
    plot: {
      x: round3(box.left),
      y: round3(box.top),
      width: round3(box.right - box.left),
      height: round3(box.bottom - box.top),
    },
    xDomain,
    yDomain,
  };
}

/**
 * The frame for an empty plots payload: the plot box from the resolved
 * padding, no domains (there is no data to domain over). Used when a chart
 * short-circuits on empty data.
 */
export function emptySeriesPlotsFrame(
  width: number,
  height: number,
  padding: ResolvedPadding,
): PlotFrame {
  const box = paddedBox({ width, height, padding });
  return {
    width,
    height,
    plot: {
      x: round3(box.left),
      y: round3(box.top),
      width: round3(box.right - box.left),
      height: round3(box.bottom - box.top),
    },
  };
}

/**
 * Shared scaffold for single-series, index-based charts (line, area):
 * resolves defaults, normalizes input, builds the a11y summary, early-returns
 * an empty Scene when there's no data, lays out points on a value-scaled
 * y-axis, and hands them to `buildMarks` for the one thing that actually
 * varies per chart — how a laid-out point becomes a Mark.
 */
export function renderSeriesChart<T>(
  kind: string,
  data: SeriesInput<T>,
  options: SeriesChartOptions<T>,
  buildMarks: (points: ScenePoint[], layout: SeriesLayout, color: string) => Mark[],
  /** Max half-size of a mark that can sit on the plot edge (may depend on point count). */
  markExtent: (pointCount: number) => number,
): Scene {
  const { width, height, color } = resolveChartShell(options);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const a11y = resolveA11y(kind, datums, options);
  const base = sceneShell({ width, height }, a11y, options);
  if (datums.length === 0) {
    if (options.plots !== true) return base;
    const frame = emptySeriesPlotsFrame(width, height, resolvePadding(options.padding));
    const plots: LinePlots | AreaPlots =
      kind === 'area'
        ? { kind: 'area', frame, series: [{ seriesIndex: 0, points: [] }] }
        : { kind: 'line', frame, series: [{ seriesIndex: 0, points: [] }] };
    return { ...base, plots };
  }

  const extentPx = markExtent(datums.length);
  const valueDomain = extent(datums.map((d) => d.value));
  const indexDomain: [number, number] = [0, datums.length - 1];
  const layoutFor = (padding: ResolvedPadding) =>
    seriesLayout(datums.length, valueDomain, { width, height, padding });
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
  const points: ScenePoint[] = datums.map((d) => ({
    id: d.id,
    label: d.label,
    value: d.value,
    index: d.index,
    x: round(layout.x(d.index)),
    y: round(layout.y(d.value)),
  }));

  const marks = buildMarks(points, layout, color);
  const xA = axisMarks(options.xAxis, axisLayoutFor(layout, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(layout, 'y'));
  // Highlight zones sit behind everything, clipped to the plot.
  const hl = highlightMarks(options.highlights, { x: layout.x, y: layout.y }, layout);
  // Reference lines sit above the data and axes; annotations sit on top
  // of everything, including axis furniture.
  const referenceLines = referenceLineMarks(
    options.referenceLines,
    indexRefLineScales(layout, datums.length, valueDomain),
    color,
  );
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(indexAnnotationMapper(datums.length, valueDomain, layout), 1),
    color,
  );

  const plots: LinePlots | AreaPlots | undefined =
    options.plots === true
      ? kind === 'area'
        ? {
            kind: 'area',
            frame: seriesPlotsFrame(width, height, layout, indexDomain, valueDomain),
            series: [{ seriesIndex: 0, points: seriesPlotsPoints(datums, layout, color, 0) }],
            baselineY: round3(layout.bottom),
          }
        : {
            kind: 'line',
            frame: seriesPlotsFrame(width, height, layout, indexDomain, valueDomain),
            series: [{ seriesIndex: 0, points: seriesPlotsPoints(datums, layout, color, 0) }],
          }
      : undefined;

  return finishScene(
    base,
    [...layerMarks(hl, xA, yA, marks), ...referenceLines],
    points,
    annMarks,
    annotationPoints,
    plots,
  );
}

/**
 * A single point has no line/area/segment to draw, so it's rendered as a dot
 * instead so it stays visible. Shared by line, area, and lines.
 */
export function singlePointDot(
  p: { x: number; y: number },
  radius: number,
  color: string,
  extra?: Partial<Omit<CircleMark, 'type' | 'cx' | 'cy' | 'r' | 'fill'>>,
): Mark {
  return { type: 'circle', cx: p.x, cy: p.y, r: radius, fill: color, ...extra };
}
