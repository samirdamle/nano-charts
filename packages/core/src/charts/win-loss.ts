import type { AnnotationOptions, BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { paddedBox, slotLayout } from '../core/plot';
import { resolveChartShell, resolveA11y, sceneShell } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import { annotationMarks, seriesAwareMapper, winLossAnnotationMapper } from '../core/annotations';

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
    marks.push({
      type: 'rect',
      class: markClass('bar', i),
      x,
      y,
      width: round(barW),
      height: h,
      fill,
      fillOpacity,
    });
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x, y, w: round(barW), h });
  });

  // Annotations sit on top of everything, centered on their index's
  // block (upper half win, lower half loss, centerline zero); `y` is
  // ignored. Centers match the drawn rects exactly (rounded slot edges
  // and widths, as the points use).
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(
      winLossAnnotationMapper(
        (i) => round(slotX(i)),
        round(barW),
        box,
        center,
        datums.map((d) => d.value),
      ),
      0,
    ),
    options.color ?? 'currentColor',
  );

  return {
    ...base,
    marks: [...marks, ...annMarks],
    points,
    ...(annotationPoints.length > 0 ? { annotationPoints } : {}),
  };
}
