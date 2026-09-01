import { describe, it, expect } from 'vitest';
import { heatmap } from '../../src/charts/heatmap';

describe('heatmap', () => {
  it('renders one rect per cell in a grid', () => {
    const scene = heatmap([[1, 4, 2], [3, 0, 5]], { cellSize: 6, gap: 0 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(6);
    // 3 cols x 6 = 18 wide, 2 rows x 6 = 12 tall
    expect(scene.width).toBe(18);
    expect(scene.height).toBe(12);
  });

  it('colors cells via the value scale (min->max)', () => {
    const scene = heatmap([[0, 10]], { cellSize: 6, gap: 0, colorScale: ['#000000', '#ffffff'] });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[0]).toMatchObject({ fill: 'rgb(0,0,0)' });
    expect(rects[1]).toMatchObject({ fill: 'rgb(255,255,255)' });
  });

  it('exposes cell points with row/col', () => {
    const scene = heatmap([[1, 2]], { cellSize: 6, gap: 0 });
    expect(scene.points).toHaveLength(2);
    expect(scene.points[1]).toMatchObject({ row: 0, col: 1, value: 2 });
  });

  it('supports a value accessor for object cells', () => {
    const scene = heatmap([[{ n: 1 }, { n: 9 }]], { value: (c: { n: number }) => c.n, cellSize: 6 });
    expect(scene.points.map((p) => p.value)).toEqual([1, 9]);
  });

  it('renders an empty scene for empty data', () => {
    expect(heatmap([]).marks).toEqual([]);
  });
});
