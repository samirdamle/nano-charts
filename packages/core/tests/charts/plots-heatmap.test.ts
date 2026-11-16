import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { heatmap, type HeatmapOptions } from '../../src/charts/heatmap';
import { toSVG } from '../../src/render/to-svg';
import type { HeatmapPlots, Plots } from '../../src/types';

// Heatmap grows around the grid with zero default padding (autoPlotPadding
// with markExtent 0 and no axes), so a 2x2 grid at cell 8, gap 1 is a
// 16x16 canvas with cells at 0.5/8.5 and size 7.
describe('heatmap plots', () => {
  it('returns one cell per datum with the grid geometry', () => {
    const scene = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      { plots: true },
    );
    const plots = scene.plots!;
    expect(plots).toBeDefined();
    expect(plots.kind).toBe('heatmap');
    expect(plots.frame).toEqual({
      width: 16,
      height: 16,
      plot: { x: 0, y: 0, width: 16, height: 16 },
      xDomain: [0, 1],
      yDomain: [0, 1],
    });
    expect(plots.cells).toHaveLength(4);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    const expected = [
      { row: 0, col: 0, value: 1, x: 0.5, y: 0.5 },
      { row: 0, col: 1, value: 2, x: 8.5, y: 0.5 },
      { row: 1, col: 0, value: 3, x: 0.5, y: 8.5 },
      { row: 1, col: 1, value: 4, x: 8.5, y: 8.5 },
    ];
    for (const [i, e] of expected.entries()) {
      const cell = plots.cells[i]!;
      expect(cell.row).toBe(e.row);
      expect(cell.col).toBe(e.col);
      expect(cell.value).toBe(e.value);
      expect(cell.x).toBe(e.x);
      expect(cell.y).toBe(e.y);
      expect(cell.width).toBe(7);
      expect(cell.height).toBe(7);
      // The resolved color is exactly the rendered rect's fill.
      expect(cell.color).toBe(rects[i]!.fill);
    }
  });

  it('honors cellSize, gap, and explicit padding', () => {
    const { plots } = heatmap([[1, 2]], { cellSize: 10, gap: 2, padding: 2, plots: true });
    expect(plots!.frame).toEqual({
      width: 24,
      height: 14,
      plot: { x: 2, y: 2, width: 20, height: 10 },
      xDomain: [0, 1],
      yDomain: [0, 0],
    });
    expect(plots!.cells[0]).toMatchObject({ row: 0, col: 0, value: 1, x: 3, y: 3, width: 8, height: 8 });
    expect(plots!.cells[1]).toMatchObject({ row: 0, col: 1, value: 2, x: 13, y: 3, width: 8, height: 8 });
  });

  it('omits missing cells in ragged rows', () => {
    const scene = heatmap(
      [
        [1, 2, 3],
        [4],
        [5, 6],
      ],
      { plots: true },
    );
    const plots = scene.plots!;
    expect(plots.frame).toEqual({
      width: 24,
      height: 24,
      plot: { x: 0, y: 0, width: 24, height: 24 },
      xDomain: [0, 2],
      yDomain: [0, 2],
    });
    expect(plots.cells.map((c) => [c.row, c.col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [2, 0],
      [2, 1],
    ]);
    expect(plots.cells.map((c) => c.value)).toEqual([1, 2, 3, 4, 5, 6]);
    // Same count as the rendered rects: plots drop exactly what marks drop.
    expect(scene.marks.filter((m) => m.type === 'rect')).toHaveLength(6);
  });

  it('returns an empty payload for empty data', () => {
    const { plots } = heatmap([], { plots: true });
    expect(plots).toEqual({
      kind: 'heatmap',
      frame: { width: 0, height: 0, plot: { x: 0, y: 0, width: 0, height: 0 } },
      cells: [],
    });
    expect(heatmap([[]], { plots: true }).plots!.cells).toEqual([]);
  });

  it('keeps full float precision where the scene rounds', () => {
    const scene = heatmap([[1]], { gap: 0.333, plots: true });
    // x = 0 + 0.1665; the scene rounds to 0.17, plots keep 0.1665.
    expect(scene.plots!.cells[0]!.x).toBeCloseTo(0.1665, 12);
    expect(scene.plots!.cells[0]!.width).toBeCloseTo(7.667, 12);
    const rect = scene.marks.find((m) => m.type === 'rect')!;
    expect(rect.x).toBe(0.17);
    expect(rect.width).toBe(7.67);
  });

  it('matches the rendered scene when axes move the plot box', () => {
    const scene = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      {
        plots: true,
        xAxis: { show: true, ticks: true, labels: true },
        yAxis: { show: true, ticks: true, labels: true },
      },
    );
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // Axes are layout: the plot box moves, so plots match the rendered
    // scene rather than the no-axes plots.
    for (const [i, cell] of scene.plots!.cells.entries()) {
      expect(Math.round(cell.x * 100) / 100).toBe(rects[i]!.x);
      expect(Math.round(cell.y * 100) / 100).toBe(rects[i]!.y);
      expect(Math.round(cell.width * 100) / 100).toBe(rects[i]!.width);
    }
    expect(scene.plots!.frame.plot.x).toBeGreaterThan(0);
    expect(scene.plots!.frame.plot.y).toBeGreaterThan(0);
  });

  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      { plots: true },
    );
    const without = heatmap([
      [1, 2],
      [3, 4],
    ]);
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect(
      'plots' in
        heatmap(
          [
            [1, 2],
            [3, 4],
          ],
          { plots: false },
        ),
    ).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations and highlights on', () => {
    const base = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      { plots: true },
    ).plots;
    expect(
      heatmap(
        [
          [1, 2],
          [3, 4],
        ],
        { plots: true, annotations: [{ x: 0, y: 0, shape: 'dot' }] },
      ).plots,
    ).toEqual(base);
    expect(
      heatmap(
        [
          [1, 2],
          [3, 4],
        ],
        { plots: true, highlights: [{ x: [0, 1], y: [0, 1], color: 'red' }] },
      ).plots,
    ).toEqual(base);
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(heatmap([[1, 2]], { plots: true }).plots).toEqualTypeOf<HeatmapPlots>();
    expectTypeOf(heatmap([[1, 2]]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: HeatmapOptions = { plots: true };
    expectTypeOf(heatmap([[1, 2]], opts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
