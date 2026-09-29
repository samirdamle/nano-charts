import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { extent, round } from '../core/geometry';
import { makeColorScale, type ColorScale } from '../core/color-scale';
import {
  autoPlotPadding,
  paddedBox,
  type PaddedBox,
  type ResolvedPadding,
} from '../core/plot';
import { axisMarks, axisSpace, type AxisLayout, type AxisOptions } from '../core/axis';
import { highlightMarks, type HighlightOption } from '../core/highlight';

export interface HeatmapOptions<T = number> extends BaseOptions {
  value?: (cell: T, row: number, col: number) => number;
  colorScale?: [string, string] | ColorScale;
  gap?: number;
  radius?: number;
  cellSize?: number;
  /** X axis (column indices). Disabled by default. */
  xAxis?: AxisOptions;
  /** Y axis (row indices). Disabled by default. */
  yAxis?: AxisOptions;
  /** Highlighted background region(s), in cell coordinates (x = column
   * index, y = row index). Clipped to the plot; purely decorative —
   * never affects padding. */
  highlight?: HighlightOption;
}

export function heatmap<T = number>(matrix: T[][], options: HeatmapOptions<T> = {}): Scene {
  const cell = options.cellSize ?? 8;
  const gap = options.gap ?? 1;
  const getValue = options.value ?? ((c: T) => c as unknown as number);

  const rows = matrix.length;
  // Size the grid to the widest row so ragged input still lays out consistently.
  const cols = rows > 0 ? Math.max(...matrix.map((row) => row.length)) : 0;

  const axisLayoutFor = (b: PaddedBox, orientation: 'x' | 'y'): AxisLayout => {
    const colCenter = (c: number): number => b.left + c * cell + cell / 2;
    const rowCenter = (r: number): number => b.top + r * cell + cell / 2;
    return orientation === 'x'
      ? {
          orientation,
          domain: [0, cols - 1],
          scale: colCenter,
          crossDomain: [0, rows - 1],
          crossScale: rowCenter,
          span: [b.left, b.right],
          crossSpan: [b.top, b.bottom],
          integerTicks: true,
        }
      : {
          orientation,
          domain: [0, rows - 1],
          scale: rowCenter,
          crossDomain: [0, cols - 1],
          crossScale: colCenter,
          span: [b.top, b.bottom],
          crossSpan: [b.left, b.right],
          integerTicks: true,
        };
  };

  // Automatic padding, iterated to a fixed point on the real layout. The
  // chart grows around the grid, so the padding is never shrunk to fit
  // (infinite dimensions): measured overflow expands the chart instead.
  const padding: ResolvedPadding = autoPlotPadding(options.padding, 0, Infinity, Infinity, (p) => {
    const b: PaddedBox = {
      left: p.left,
      right: cols * cell + p.left,
      top: p.top,
      bottom: rows * cell + p.top,
    };
    return {
      x: axisSpace(options.xAxis, axisLayoutFor(b, 'x')),
      y: axisSpace(options.yAxis, axisLayoutFor(b, 'y')),
    };
  });
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
      desc:
        options.desc ??
        (flat.length === 0 ? 'heatmap, no data' : `heatmap, ${rows} by ${cols} cells`),
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
        // Dense position in the points array (skipped cells emit nothing),
        // matching the circle-mark contract the demo's hover lookup uses.
        index: points.length,
      });
      points.push({
        id: `${r}-${c}`,
        label: String(value),
        value,
        index: r * cols + c,
        row: r,
        col: c,
        x,
        y,
        w: size,
        h: size,
      });
    }
  }

  // Both axes are categorical: ticks sit at cell centers.
  const xA = axisMarks(options.xAxis, axisLayoutFor(box, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(box, 'y'));
  // Highlight zones address cell centers, like the axis ticks.
  const hl = highlightMarks(
    options.highlight,
    {
      x: (c: number) => box.left + c * cell + cell / 2,
      y: (r: number) => box.top + r * cell + cell / 2,
    },
    box,
  );

  return { ...base, marks: [...hl, ...xA.grid, ...yA.grid, ...marks, ...xA.axis, ...yA.axis], points };
}
