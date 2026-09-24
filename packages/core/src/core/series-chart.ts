import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from './geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from './normalize';
import { resolvePadding, seriesLayout, type ResolvedPadding, type SeriesLayout } from './plot';
import { seriesSummary } from './a11y';

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
): Scene {
  return {
    width: shell.width,
    height: shell.height,
    viewBox: `0 0 ${shell.width} ${shell.height}`,
    marks: [],
    points: [],
    a11y,
  };
}

export interface SeriesChartOptions<T> extends BaseOptions, Partial<SeriesAccessors<T>> {}

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
): Scene {
  const { width, height, color, padding } = resolveChartShell(options);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const a11y = resolveA11y(kind, datums, options);
  const base = sceneShell({ width, height }, a11y);
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

  return { ...base, marks: buildMarks(points, layout, color), points };
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
