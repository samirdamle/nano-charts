import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import {
  normalizeSeries,
  type SeriesAccessors,
  type SeriesColorAccessor,
  type SeriesInput,
} from '../core/normalize';
import { categoricalColor } from '../core/palette';
import { seriesLayout, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';

export interface BarTrackOptions {
  /** The "100%" the track represents. When larger than the data max it
   * extends the value domain so the track genuinely spans the full scale. */
  max?: number;
  /** Track fill. Defaults to the chart's base color (theme-aware at low opacity). */
  color?: string;
  /** Track opacity. Defaults to 0.15. */
  opacity?: number;
  /** Corner rounding for the track. Defaults to the bar's `radius`. */
  radius?: number;
}

export interface BarOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    Partial<SeriesColorAccessor<T>> {
  gap?: number;
  radius?: number;
  horizontal?: boolean;
  /** Background track behind each bar spanning the full value domain.
   * `true` enables it with defaults; an object tunes it. */
  track?: boolean | BarTrackOptions;
}

type BarSegment<T> =
  | number
  | { id?: string | number; label?: string; value: number; color?: string }
  | T;
export type BarInput<T = number> = Array<BarSegment<T> | BarSegment<T>[]>;

export function bar<T = number>(data: BarInput<T>, options: BarOptions<T> = {}): Scene {
  const { width, height, color, padding } = resolveChartShell(options);
  const gap = options.gap ?? 0.2;
  const horizontal = options.horizontal ?? false;
  const accessors = options.value
    ? {
        value: options.value,
        label: options.label,
        id: options.id,
        colorAccessor: options.colorAccessor,
      }
    : undefined;

  // Normalize into columns of segment-datums.
  const columns: Datum[][] = data.map((d, col) => {
    const segs = (Array.isArray(d) ? d : [d]) as SeriesInput<T>;
    return normalizeSeries(segs, accessors).map((s) => ({ ...s, index: col }));
  });

  const totals = columns.map((segs) => segs.reduce((sum, s) => sum + s.value, 0));
  const flat: Datum[] = columns.map((_segs, col) => ({
    id: col,
    label: String(totals[col]),
    value: totals[col]!,
    index: col,
  }));
  const a11y = resolveA11y('bar', flat, options);
  const base = sceneShell({ width, height }, a11y);
  if (columns.length === 0) return base;

  const [minT, maxT] = extent(totals);
  const track = options.track === true ? {} : options.track || undefined;
  // An explicit track max larger than the data extends the domain so the
  // track genuinely represents 100% instead of being squashed to the data max.
  const domain: [number, number] = [
    Math.min(0, minT),
    Math.max(0, maxT, track?.max ?? -Infinity),
  ];
  const layout = seriesLayout(columns.length, domain, { width, height, padding });

  // Value axis runs along x when horizontal, y otherwise; the category
  // ("slot") axis runs along the other one. slotLayout is axis-agnostic —
  // it just divides a numeric span into gapped slots — so the horizontal
  // case reuses it unchanged, just fed the vertical bounds instead.
  const valueScale = horizontal ? linearScale(domain, [layout.left, layout.right]) : layout.y;
  const slot = horizontal
    ? slotLayout(columns.length, layout.top, layout.bottom, gap)
    : slotLayout(columns.length, layout.left, layout.right, gap);
  const barW = round(slot.barWidth);

  // Precedence, matching donut: explicit per-segment color (field/accessor)
  // > uniform options.color, with the legacy opacity step-down as its only
  // differentiator > categorical palette per stacked segment.
  const hasUniformColor = options.color !== undefined;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  // One track rect per column, drawn first (behind the segments), spanning
  // the full value domain. Tracks are decorative: they emit no points.
  if (track) {
    const tStart = valueScale(domain[0]);
    const tEnd = valueScale(domain[1]);
    const tPos = round(Math.min(tStart, tEnd));
    const tLen = round(Math.abs(tEnd - tStart));
    const trackFill = track.color ?? color;
    const trackOpacity = round(track.opacity ?? 0.15);
    const trackRx = track.radius ?? options.radius;
    columns.forEach((_segs, col) => {
      const slotPos = round(slot.x(col));
      marks.push({
        type: 'rect',
        x: horizontal ? tPos : slotPos,
        y: horizontal ? slotPos : tPos,
        width: horizontal ? tLen : barW,
        height: horizontal ? barW : tLen,
        fill: trackFill,
        fillOpacity: trackOpacity,
        rx: trackRx,
      });
    });
  }

  columns.forEach((segs, col) => {
    const slotPos = round(slot.x(col));
    const stacked = segs.length > 1;
    let cursor = 0; // running stacked value
    segs.forEach((seg, row) => {
      // Handle negative values: the segment spans between the two mapped
      // scale outputs, so take min/max rather than assuming value >= 0
      // (else length goes negative).
      const vStart = valueScale(cursor);
      const vEnd = valueScale(cursor + seg.value);
      const posRaw = Math.min(vStart, vEnd);
      const pos = round(posRaw);
      const len = round(Math.max(vStart, vEnd) - posRaw);

      const x = horizontal ? pos : slotPos;
      const y = horizontal ? slotPos : pos;
      const w = horizontal ? len : barW;
      const h = horizontal ? barW : len;

      const explicitColor = seg.color;
      const segmentColor =
        explicitColor ?? (stacked && !hasUniformColor ? categoricalColor(row, segs.length) : color);
      const useStripe = stacked && explicitColor === undefined && hasUniformColor;

      marks.push({
        type: 'rect',
        x,
        y,
        width: w,
        height: h,
        fill: segmentColor,
        fillOpacity: round(useStripe ? Math.max(0.4, 1 - row * 0.3) : 1),
        rx: options.radius,
      });
      points.push({
        id: seg.id,
        label: seg.label,
        value: seg.value,
        index: col,
        col,
        row,
        x,
        y,
        w,
        h,
      });
      cursor += seg.value;
    });
  });

  return { ...base, marks, points };
}
