import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import {
  normalizeSeries,
  type SeriesAccessors,
  type SeriesColorAccessor,
  type SeriesInput,
} from '../core/normalize';
import { resolveSegmentColor } from '../core/palette';
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

/** How multi-segment columns are laid out: `'stacked'` (default) piles
 * segments end to end into one bar per column; `'grouped'` places them
 * side by side as one bar per segment. */
export type BarMode = 'stacked' | 'grouped';

export interface BarOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    Partial<SeriesColorAccessor<T>> {
  gap?: number;
  radius?: number;
  horizontal?: boolean;
  /** Segment layout within a column. Defaults to `'stacked'`. */
  mode?: BarMode;
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
  const mode = options.mode ?? 'stacked';
  const grouped = mode === 'grouped';
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
  // Grouped bars stand alone, so the value domain spans individual segment
  // values; stacked bars accumulate, so it spans column totals. The a11y
  // summary follows the same split: per segment when grouped, per column
  // when stacked.
  const domainValues = grouped
    ? columns.flatMap((segs) => segs.map((s) => s.value))
    : totals;
  const flat: Datum[] = grouped
    ? columns.flatMap((segs, col) => segs.map((s) => ({ ...s, index: col })))
    : columns.map((_segs, col) => ({
        id: col,
        label: String(totals[col]),
        value: totals[col]!,
        index: col,
      }));
  const a11y = resolveA11y('bar', flat, options);
  const base = sceneShell({ width, height }, a11y);
  if (columns.length === 0) return base;

  const [minT, maxT] = extent(domainValues.length > 0 ? domainValues : [0]);
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

  // Grouped mode subdivides each column slot into one sub-slot per segment.
  // Sizing by the widest column keeps bar widths uniform when columns are
  // ragged; shorter columns center their bars within the group.
  const groupCount = grouped ? Math.max(1, ...columns.map((segs) => segs.length)) : 0;
  const subSlot = grouped ? slotLayout(groupCount, 0, barW, gap) : undefined;
  const subW = subSlot ? round(subSlot.barWidth) : barW;

  // Precedence, matching donut: explicit per-segment color (field/accessor)
  // > uniform options.color, with the legacy opacity step-down as its only
  // differentiator > categorical palette per segment (series index).
  const hasUniformColor = options.color !== undefined;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  // One track rect per bar, drawn first (behind the segments), spanning the
  // full value domain. In stacked mode a column is one bar; in grouped mode
  // each segment is. Tracks are decorative: they emit no points.
  if (track) {
    const tStart = valueScale(domain[0]);
    const tEnd = valueScale(domain[1]);
    const tPos = round(Math.min(tStart, tEnd));
    const tLen = round(Math.abs(tEnd - tStart));
    const trackFill = track.color ?? color;
    const trackOpacity = round(track.opacity ?? 0.15);
    const trackRx = track.radius ?? options.radius;
    columns.forEach((segs, col) => {
      const slotPos = round(slot.x(col));
      const lead = subSlot ? (groupCount - segs.length) / 2 : 0;
      const bars = subSlot
        ? segs.map((_, row) => round(slotPos + subSlot.x(lead + row)))
        : [slotPos];
      const tw = subSlot ? subW : barW;
      bars.forEach((bp) => {
        marks.push({
          type: 'rect',
          x: horizontal ? tPos : bp,
          y: horizontal ? bp : tPos,
          width: horizontal ? tLen : tw,
          height: horizontal ? tw : tLen,
          fill: trackFill,
          fillOpacity: trackOpacity,
          rx: trackRx,
        });
      });
    });
  }

  columns.forEach((segs, col) => {
    const slotPos = round(slot.x(col));
    const lead = subSlot ? (groupCount - segs.length) / 2 : 0;
    const multi = segs.length > 1;
    let cursor = 0; // running stacked value
    segs.forEach((seg, row) => {
      // Grouped bars each start at the zero baseline; stacked segments
      // accumulate from a running cursor. Either way the segment spans the
      // two mapped scale outputs — take min/max rather than assuming
      // value >= 0 (else length goes negative).
      const startValue = grouped ? 0 : cursor;
      const vStart = valueScale(startValue);
      const vEnd = valueScale(startValue + seg.value);
      const posRaw = Math.min(vStart, vEnd);
      const pos = round(posRaw);
      const len = round(Math.max(vStart, vEnd) - posRaw);
      if (!grouped) cursor += seg.value;

      const barPos = subSlot ? round(slotPos + subSlot.x(lead + row)) : slotPos;
      const bw = subSlot ? subW : barW;
      const x = horizontal ? pos : barPos;
      const y = horizontal ? barPos : pos;
      const w = horizontal ? len : bw;
      const h = horizontal ? bw : len;

      const explicitColor = seg.color;
      const segmentColor = resolveSegmentColor({
        explicit: explicitColor,
        uniform: color,
        usePalette: multi && !hasUniformColor,
        paletteIndex: row,
        paletteTotal: segs.length,
      });
      // The opacity step-down distinguishes stacked segments sharing one hue;
      // grouped bars are distinct series, so they stay at full opacity.
      const useStripe = !grouped && multi && explicitColor === undefined && hasUniformColor;

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
    });
  });

  return { ...base, marks, points };
}
