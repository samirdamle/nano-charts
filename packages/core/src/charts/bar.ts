import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { extent, linearScale, round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { seriesLayout, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';

export interface BarOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  gap?: number;
  radius?: number;
  horizontal?: boolean;
}

type BarSegment<T> = number | { id?: string | number; label?: string; value: number } | T;
export type BarInput<T = number> = Array<BarSegment<T> | BarSegment<T>[]>;

export function bar<T = number>(data: BarInput<T>, options: BarOptions<T> = {}): Scene {
  const { width, height, color, padding } = resolveChartShell(options);
  const gap = options.gap ?? 0.2;
  const horizontal = options.horizontal ?? false;
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
  const domain: [number, number] = [Math.min(0, minT), Math.max(0, maxT)];
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

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  columns.forEach((segs, col) => {
    const slotPos = round(slot.x(col));
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

      marks.push({
        type: 'rect',
        x,
        y,
        width: w,
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
        y,
        w,
        h,
      });
      cursor += seg.value;
    });
  });

  return { ...base, marks, points };
}
