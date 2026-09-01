import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolvePadding } from '../core/plot';
import { seriesSummary } from '../core/a11y';

export interface WinLossOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  gap?: number;
  winColor?: string;
  lossColor?: string;
}

export function winLoss<T = number>(
  data: SeriesInput<T>,
  options: WinLossOptions<T> = {},
): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const gap = options.gap ?? 0.2;
  const winColor = options.winColor ?? options.color ?? 'currentColor';
  const lossColor = options.lossColor ?? options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const summary = seriesSummary('win/loss', datums);
  const a11y = { title: options.title ?? summary.title, desc: options.desc ?? summary.desc };
  const base: Scene = { width, height, viewBox: `0 0 ${width} ${height}`, marks: [], points: [], a11y };
  if (datums.length === 0) return base;

  const left = padding.left;
  const right = width - padding.right;
  const top = padding.top;
  const bottom = height - padding.bottom;
  const center = (top + bottom) / 2;
  const barHeight = center - top;
  const slot = (right - left) / datums.length;
  const barW = slot * (1 - gap);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  datums.forEach((d, i) => {
    const x = round(left + i * slot + (slot - barW) / 2);
    let y: number;
    let h: number;
    let fill: string;
    let fillOpacity: number | undefined;
    if (d.value > 0) {
      y = round(top);
      h = round(barHeight);
      fill = winColor;
    } else if (d.value < 0) {
      y = round(center);
      h = round(barHeight);
      fill = lossColor;
      fillOpacity = lossColor === winColor ? 0.4 : undefined;
    } else {
      y = round(center - 0.5);
      h = 1;
      fill = winColor;
      fillOpacity = 0.4;
    }
    marks.push({ type: 'rect', x, y, width: round(barW), height: h, fill, fillOpacity });
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x, y, w: round(barW), h });
  });

  return { ...base, marks, points };
}
