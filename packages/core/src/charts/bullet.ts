import type { BaseOptions, Mark, Scene } from '../types';
import { linearScale, round } from '../core/geometry';
import { paddedBox, resolvePadding } from '../core/plot';

export interface BulletData {
  value: number;
  target: number;
  ranges?: number[];
  max?: number;
  id?: string | number;
  label?: string;
}

export type BulletOptions = BaseOptions;

export function bullet(data: BulletData, options: BulletOptions = {}): Scene {
  const width = options.width ?? 100;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const padding = resolvePadding(options.padding);
  const ranges = (data.ranges ?? []).slice().sort((a, b) => a - b);
  const max = data.max ?? Math.max(data.value, data.target, ...ranges, 0);

  const { left, right, top, bottom } = paddedBox({ width, height, padding });
  const xScale = linearScale([0, max], [left, right]);

  const marks: Mark[] = [];

  // Qualitative range bands, lightest (widest/last) drawn first so darker sits on top.
  for (let i = ranges.length - 1; i >= 0; i--) {
    marks.push({
      type: 'rect',
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
    x: round(left),
    y: round(barY),
    width: round(xScale(data.value) - left),
    height: round(barH),
    fill: color,
  });

  // Target tick.
  const tx = round(xScale(data.target));
  marks.push({ type: 'line', x1: tx, y1: round(top), x2: tx, y2: round(bottom), stroke: color, strokeWidth: 1 });

  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks,
    points: [
      {
        id: data.id ?? 0,
        label: data.label ?? String(data.value),
        value: data.value,
        index: 0,
        x: round(xScale(data.value)),
        y: round((top + bottom) / 2),
      },
    ],
    a11y: {
      title: options.title ?? 'bullet chart',
      desc: options.desc ?? `bullet chart, value ${data.value}, target ${data.target}, max ${max}`,
    },
  };
}
