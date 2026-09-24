import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { makeColorScale, type ColorScale } from '../core/color-scale';
import { paddedBox, resolvePadding } from '../core/plot';

export interface HeatmapOptions<T = number> extends BaseOptions {
  value?: (cell: T, row: number, col: number) => number;
  colorScale?: [string, string] | ColorScale;
  gap?: number;
  radius?: number;
  cellSize?: number;
}

export function heatmap<T = number>(matrix: T[][], options: HeatmapOptions<T> = {}): Scene {
  const cell = options.cellSize ?? 8;
  const gap = options.gap ?? 1;
  const getValue = options.value ?? ((c: T) => c as unknown as number);

  const padding = resolvePadding(options.padding, 0);
  const rows = matrix.length;
  // Size the grid to the widest row so ragged input still lays out consistently.
  const cols = rows > 0 ? Math.max(...matrix.map((row) => row.length)) : 0;
  const width = cols * cell + padding.left + padding.right;
  const height = rows * cell + padding.top + padding.bottom;
  const box = paddedBox({ width, height, padding });

  const flat: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellRaw = matrix[r]?.[c];
      if (cellRaw === undefined) continue; // skip missing cells in ragged rows
      flat.push(getValue(cellRaw, r, c));
    }
  }

  const base: Scene = {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks: [],
    points: [],
    a11y: {
      title: options.title ?? 'heatmap',
      desc: options.desc ?? (flat.length === 0 ? 'heatmap, no data' : `heatmap, ${rows} by ${cols} cells`),
    },
  };
  if (flat.length === 0) return base;

  const domain = extent(flat);
  const scale = makeColorScale(options.colorScale, domain);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellRaw = matrix[r]?.[c];
      if (cellRaw === undefined) continue; // skip missing cells in ragged rows
      const value = getValue(cellRaw, r, c);
      const x = round(box.left + c * cell + gap / 2);
      const y = round(box.top + r * cell + gap / 2);
      const size = round(cell - gap);
      marks.push({
        type: 'rect',
        x,
        y,
        width: size,
        height: size,
        fill: scale(value, { min: domain[0], max: domain[1] }),
        rx: options.radius,
      });
      points.push({ id: `${r}-${c}`, label: String(value), value, index: r * cols + c, row: r, col: c, x, y, w: size, h: size });
    }
  }
  return { ...base, marks, points };
}
