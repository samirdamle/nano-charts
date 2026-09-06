import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { paddedBox, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';

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
  const { width, height, padding } = resolveChartShell(options);
  const gap = options.gap ?? 0.2;
  const winColor = options.winColor ?? options.color ?? 'currentColor';
  const lossColor = options.lossColor ?? options.color ?? 'currentColor';
  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data, accessors);

  const a11y = resolveA11y('win/loss', datums, options);
  const base = sceneShell({ width, height }, a11y);
  if (datums.length === 0) return base;

  const box = paddedBox({ width, height, padding });
  const center = (box.top + box.bottom) / 2;
  const barHeight = center - box.top;
  const { barWidth: barW, x: slotX } = slotLayout(datums.length, box.left, box.right, gap);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  datums.forEach((d, i) => {
    const x = round(slotX(i));
    let y: number;
    let h: number;
    let fill: string;
    let fillOpacity: number | undefined;
    if (d.value > 0) {
      y = round(box.top);
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
