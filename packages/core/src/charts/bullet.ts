import type { AnnotationOptions, BaseOptions, Mark, Scene } from '../types';
import { linearScale, round } from '../core/geometry';
import { paddedBox } from '../core/plot';
import { resolveChartShell, sceneShell } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import { annotationMarks, bulletAnnotationMapper, seriesAwareMapper } from '../core/annotations';
import { finishScene } from '../core/scene';

export interface BulletData {
  value: number;
  target: number;
  ranges?: number[];
  max?: number;
  id?: string | number;
  label?: string;
}

export type BulletOptions = BaseOptions & AnnotationOptions;

export function bullet(data: BulletData, options: BulletOptions = {}): Scene {
  const { width, height, color, padding } = resolveChartShell(options);
  // Clamp policy: bullet geometry lives on [0, max]. Negative inputs are
  // clamped to 0 (no rect can get a negative width) and value/target are
  // clamped into [0, max] so nothing draws off-canvas. The scene reflects
  // the clamped values throughout.
  const ranges = (data.ranges ?? []).map((r) => Math.max(0, r)).sort((a, b) => a - b);
  const max = Math.max(0, data.max ?? Math.max(data.value, data.target, ...ranges, 0));
  const value = Math.min(Math.max(data.value, 0), max);
  const target = Math.min(Math.max(data.target, 0), max);

  const { left, right, top, bottom } = paddedBox({ width, height, padding });
  const xScale = linearScale([0, max], [left, right]);
  // Centerline shared by the measure bar's scene point and the annotation
  // mapper: one value for the bullet's vertical center.
  const centerY = (top + bottom) / 2;

  const marks: Mark[] = [];

  // Qualitative range bands, lightest (widest/last) drawn first so darker sits on top.
  for (let i = ranges.length - 1; i >= 0; i--) {
    marks.push({
      type: 'rect',
      class: markClass('range', i),
      x: round(left),
      y: round(top),
      width: round(xScale(ranges[i]!) - left),
      height: round(bottom - top),
      fill: color,
      fillOpacity: round(0.15 + (0.25 * (ranges.length - 1 - i)) / Math.max(1, ranges.length - 1)),
    });
  }

  // Measure (value) bar — centered, thinner.
  const barH = (bottom - top) * 0.4;
  const barY = top + (bottom - top - barH) / 2;
  marks.push({
    type: 'rect',
    class: markClass('bar'),
    x: round(left),
    y: round(barY),
    width: round(xScale(value) - left),
    height: round(barH),
    fill: color,
  });

  // Target tick.
  const tx = round(xScale(target));
  marks.push({
    type: 'line',
    class: markClass('target'),
    x1: tx,
    y1: round(top),
    x2: tx,
    y2: round(bottom),
    stroke: color,
    strokeWidth: 1,
  });

  // Annotations sit on top of everything, at their value on the
  // centerline; `y` is ignored.
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(bulletAnnotationMapper(xScale, max, centerY), 0),
    color,
  );
  return finishScene(
    sceneShell(
      { width, height },
      {
        title: options.title ?? 'bullet chart',
        desc: options.desc ?? `bullet chart, value ${value}, target ${target}, max ${max}`,
      },
      options,
    ),
    marks,
    [
      {
        id: data.id ?? 0,
        label: data.label ?? String(value),
        value,
        index: 0,
        x: round(xScale(value)),
        y: round(centerY),
      },
    ],
    annMarks,
    annotationPoints,
  );
}
