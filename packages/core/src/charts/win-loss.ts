import type { AnnotationOptions, BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { paddedBox, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import {
  annotationMarks,
  inIndex,
  seriesAwareMapper,
  type AnnotationMapper,
} from '../core/annotations';

export interface WinLossOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    AnnotationOptions {
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
  const base = sceneShell({ width, height }, a11y, options);
  if (datums.length === 0) return base;

  const box = paddedBox({ width, height, padding });
  const center = (box.top + box.bottom) / 2;
  const barHeight = center - box.top;
  const { barWidth: barW, x: slotX } = slotLayout(datums.length, box.left, box.right, gap);

  // Block rect shared by the block loop below and the annotation mapper:
  // unrounded geometry — the loop rounds each edge, the mapper centers
  // from the same rect, so the two can never disagree.
  const blockRect = (i: number) => {
    const v = datums[i]!.value;
    if (v > 0) return { x: slotX(i), y: box.top, w: barW, h: barHeight };
    if (v < 0) return { x: slotX(i), y: center, w: barW, h: barHeight };
    return { x: slotX(i), y: center - 0.5, w: barW, h: 1 };
  };

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  datums.forEach((d, i) => {
    const r = blockRect(i);
    const x = round(r.x);
    const y = round(r.y);
    const w = round(r.w);
    const h = round(r.h);
    let fill: string;
    let fillOpacity: number | undefined;
    if (d.value > 0) {
      fill = winColor;
    } else if (d.value < 0) {
      fill = lossColor;
      fillOpacity = lossColor === winColor ? 0.4 : undefined;
    } else {
      fill = winColor;
      fillOpacity = 0.4;
    }
    marks.push({
      type: 'rect',
      class: markClass('bar', i),
      x,
      y,
      width: w,
      height: h,
      fill,
      fillOpacity,
    });
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x, y, w, h });
  });

  // Annotations sit on top of everything, centered on their index's
  // block (upper half win, lower half loss, centerline zero); `y` is
  // ignored. Centers match the drawn rects exactly (rounded slot edges
  // and widths, as the points use).
  // Thin mapper over the shared block rect: `x` is the data index
  // (integer), `y` ignored — the mark centers on that index's block.
  const winLossMapper: AnnotationMapper = (a) => {
    if (!inIndex(a.x, datums.length)) return null;
    const r = blockRect(a.x);
    return { x: round(r.x) + round(r.w) / 2, y: r.y + r.h / 2 };
  };
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(winLossMapper, 0),
    options.color ?? 'currentColor',
  );

  return {
    ...base,
    marks: [...marks, ...annMarks],
    points,
    ...(annotationPoints.length > 0 ? { annotationPoints } : {}),
  };
}
