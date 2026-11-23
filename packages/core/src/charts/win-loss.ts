import type {
  AnnotationOptions,
  BaseOptions,
  Mark,
  Scene,
  ScenePoint,
  WinLossPlots,
  WinLossPlotsBlock,
} from '../types';
import { round, round3 } from '../core/geometry';
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
import { finishScene } from '../core/scene';

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
  options: WinLossOptions<T> & { plots: true },
): Scene & { plots: WinLossPlots };
export function winLoss<T = number>(data: SeriesInput<T>, options?: WinLossOptions<T>): Scene;
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
  const box = paddedBox({ width, height, padding });
  // The frame is the padded plot box. The x domain is the data index;
  // there is no value domain — block height is fixed by the sign, not
  // by the value's magnitude.
  const plotsFrame = {
    width,
    height,
    plot: {
      x: round3(box.left),
      y: round3(box.top),
      width: round3(box.right - box.left),
      height: round3(box.bottom - box.top),
    },
    ...(datums.length > 0 ? { xDomain: [0, datums.length - 1] as const } : {}),
  };
  if (datums.length === 0) {
    if (options.plots !== true) return base;
    return { ...base, plots: { kind: 'winLoss', frame: plotsFrame, blocks: [] } };
  }

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
  // Plots are built only when requested, from the same block rects as
  // the marks.
  const plotsOn = options.plots === true;
  const plotsBlocks: WinLossPlotsBlock[] = [];

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
    if (plotsOn) {
      plotsBlocks.push({
        index: i,
        value: d.value,
        sign: d.value > 0 ? 'up' : d.value < 0 ? 'down' : 'flat',
        // Geometry rounded to 3 decimals; the marks above round the same
        // values to 2dp. `value` is the raw datum and stays exact.
        x: round3(r.x),
        y: round3(r.y),
        width: round3(r.w),
        height: round3(r.h),
        // The rect's fill (the 0.4 dimming on flat blocks is an opacity,
        // not a different color).
        color: fill,
      });
    }
  });

  // Annotations sit on top of everything, centered on their index's
  // block (upper half win, lower half loss, centerline zero); `y` is
  // ignored. Centers match the drawn rects exactly (rounded slot edges
  // and widths, as the points use).
  // Thin mapper over the shared block rect: `x` is the data index
  // (integer), `y` ignored — the mark centers on that index's block.
  const winLossMapper: AnnotationMapper = (a) => {
    if (!inIndex(a.x, datums.length)) return null;
    const r = blockRect(a.x as number);
    return { x: round(r.x) + round(r.w) / 2, y: r.y + r.h / 2 };
  };
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(winLossMapper, 0),
    options.color ?? 'currentColor',
  );

  const plots: WinLossPlots | undefined = plotsOn
    ? { kind: 'winLoss', frame: plotsFrame, blocks: plotsBlocks }
    : undefined;
  return finishScene(base, marks, points, annMarks, annotationPoints, plots);
}
