import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { seriesLayout, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';

export interface BarOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  gap?: number;
  radius?: number;
}

type BarSegment<T> = number | { id?: string | number; label?: string; value: number } | T;
export type BarInput<T = number> = Array<BarSegment<T> | BarSegment<T>[]>;

export function bar<T = number>(data: BarInput<T>, options: BarOptions<T> = {}): Scene {
  const { width, height, color, padding } = resolveChartShell(options);
  const gap = options.gap ?? 0.2;
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
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
  const layout = seriesLayout(columns.length, [Math.min(0, minT), Math.max(0, maxT)], {
    width,
    height,
    padding,
  });
  const { barWidth: barW, x: slotX } = slotLayout(columns.length, layout.left, layout.right, gap);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  columns.forEach((segs, col) => {
    const x = round(slotX(col));
    let cursor = 0; // running stacked value
    segs.forEach((seg, row) => {
      // Handle negative values: the segment spans between the two mapped y's,
      // so take min/max rather than assuming value >= 0 (else height goes negative).
      const yStart = layout.y(cursor);
      const yEnd = layout.y(cursor + seg.value);
      const topRaw = Math.min(yStart, yEnd);
      const yTop = round(topRaw);
      const h = round(Math.max(yStart, yEnd) - topRaw);
      marks.push({
        type: 'rect',
        x,
        y: yTop,
        width: round(barW),
        height: h,
        fill: color,
        fillOpacity: round(row === 0 ? 1 : Math.max(0.4, 1 - row * 0.3)),
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
        y: yTop,
        w: round(barW),
        h,
      });
      cursor += seg.value;
    });
  });

  return { ...base, marks, points };
}
