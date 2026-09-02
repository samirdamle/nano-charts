import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { makeColorScale, type ColorScale } from '../core/color-scale';

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

  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0]!.length : 0;
  const width = cols * cell;
  const height = rows * cell;

  const flat: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) flat.push(getValue(matrix[r]![c]!, r, c));
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
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const value = flat[i++]!;
      const x = round(c * cell + gap / 2);
      const y = round(r * cell + gap / 2);
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
