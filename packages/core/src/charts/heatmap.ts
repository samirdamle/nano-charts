import type {
  AnnotationOptions,
  BaseOptions,
  HeatmapPlots,
  HeatmapPlotsCell,
  Mark,
  Scene,
  ScenePoint,
} from '../types';
import { extent, round } from '../core/geometry';
import { makeColorScale, type ColorScale } from '../core/color-scale';
import {
  autoPlotPadding,
  paddedBox,
  type PaddedBox,
  type ResolvedPadding,
} from '../core/plot';
import { axisLayout, axisMarks, axisSpace, layerMarks, type AxisLayout, type AxisOptions } from '../core/axis';
import { sceneShell } from '../core/series-chart';
import { highlightMarks, type HighlightZones } from '../core/highlight';
import { markClass } from '../core/css-classes';
import {
  annotationMarks,
  inIndex,
  isFinitePair,
  seriesAwareMapper,
  type AnnotationMapper,
} from '../core/annotations';
import { finishScene } from '../core/scene';

export interface HeatmapOptions<T = number> extends BaseOptions, AnnotationOptions {
  value?: (cell: T, row: number, col: number) => number;
  colorScale?: [string, string] | ColorScale;
  gap?: number;
  radius?: number;
  cellSize?: number;
  /** X axis (column indices). Disabled by default. */
  xAxis?: AxisOptions;
  /** Y axis (row indices). Disabled by default. */
  yAxis?: AxisOptions;
  /** Array of highlighted background regions, in cell coordinates (x = column
   * index, y = row index). Clipped to the plot; purely decorative —
   * never affects padding. */
  highlights?: HighlightZones;
}

export function heatmap<T = number>(
  matrix: T[][],
  options: HeatmapOptions<T> & { plots: true },
): Scene & { plots: HeatmapPlots };
export function heatmap<T = number>(matrix: T[][], options?: HeatmapOptions<T>): Scene;
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
    return axisLayout(orientation, {
      domain: [0, cols - 1],
      scale: colCenter,
      crossDomain: [0, rows - 1],
      crossScale: rowCenter,
      span: [b.left, b.right],
      crossSpan: [b.top, b.bottom],
      integerTicks: true,
    });
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

  // Cell centers shared by the highlight scales below and the annotation
  // mapper: one formula for a cell's center.
  const colCenter = (c: number): number => box.left + c * cell + cell / 2;
  const rowCenter = (r: number): number => box.top + r * cell + cell / 2;

  const flat: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellRaw = matrix[r]?.[c];
      if (cellRaw === undefined) continue; // skip missing cells in ragged rows
      flat.push(getValue(cellRaw, r, c));
    }
  }

  const base: Scene = sceneShell(
    { width, height },
    {
      title: options.title ?? 'heatmap',
      desc:
        options.desc ??
        (flat.length === 0 ? 'heatmap, no data' : `heatmap, ${rows} by ${cols} cells`),
    },
    options,
  );
  // The frame is the padded plot box; index domains only exist on a
  // non-empty grid.
  const plotsFrame = {
    width,
    height,
    plot: { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top },
    ...(cols > 0 && rows > 0 ? { xDomain: [0, cols - 1] as const, yDomain: [0, rows - 1] as const } : {}),
  };
  if (flat.length === 0) {
    if (options.plots !== true) return base;
    return { ...base, plots: { kind: 'heatmap', frame: plotsFrame, cells: [] } };
  }

  const domain = extent(flat);
  const scale = makeColorScale(options.colorScale, domain);

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];
  // Plots are built only when requested; the cell loop below fills
  // `cells` from the same geometry as the marks.
  const plotsOn = options.plots === true;
  const cells: HeatmapPlotsCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellRaw = matrix[r]?.[c];
      if (cellRaw === undefined) continue; // skip missing cells in ragged rows
      const value = getValue(cellRaw, r, c);
      const x = round(box.left + c * cell + gap / 2);
      const y = round(box.top + r * cell + gap / 2);
      const size = round(cell - gap);
      const fill = scale(value, { min: domain[0], max: domain[1] });
      marks.push({
        type: 'rect',
        class: markClass('cell', points.length),
        x,
        y,
        width: size,
        height: size,
        fill,
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
      if (plotsOn) {
        cells.push({
          row: r,
          col: c,
          value,
          // Full-precision geometry; the marks above round the same values.
          x: box.left + c * cell + gap / 2,
          y: box.top + r * cell + gap / 2,
          width: cell - gap,
          height: cell - gap,
          color: fill,
        });
      }
    }
  }

  // Both axes are categorical: ticks sit at cell centers.
  const xA = axisMarks(options.xAxis, axisLayoutFor(box, 'x'));
  const yA = axisMarks(options.yAxis, axisLayoutFor(box, 'y'));
  // Highlight zones address cell centers, like the axis ticks.
  const hl = highlightMarks(options.highlights, { x: colCenter, y: rowCenter }, box);

  // Annotations sit on top of everything, at their cell's center.
  // Thin mapper over the shared cell centers: `x` is the column, `y` the
  // row (integers); missing ragged cells drop.
  const heatmapMapper: AnnotationMapper = (a) => {
    if (!isFinitePair(a) || !inIndex(a.x, cols) || !inIndex(a.y, rows)) return null;
    if (matrix[a.y]?.[a.x] === undefined) return null;
    return { x: colCenter(a.x), y: rowCenter(a.y) };
  };
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(heatmapMapper, 0),
    options.color ?? 'currentColor',
  );

  return finishScene(
    base,
    [...layerMarks(hl, xA, yA, marks)],
    points,
    annMarks,
    annotationPoints,
    plotsOn ? { kind: 'heatmap', frame: plotsFrame, cells } : undefined,
  );
}
