import { describe, it, expect } from 'vitest';
import { scatter } from '../../src/charts/scatter';

describe('scatter', () => {
  it('maps [x,y] pairs into circles', () => {
    const scene = scatter([[0, 0], [10, 10]], { width: 100, height: 20, radius: 1 });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(2);
    // x domain [0,10] -> [1,99]; y domain [0,10] -> [19,1] (inverted)
    expect(circles[0]).toMatchObject({ cx: 1, cy: 19, r: 1 });
    expect(circles[1]).toMatchObject({ cx: 99, cy: 1, r: 1 });
  });

  it('accepts {x,y} objects and exposes points', () => {
    const scene = scatter([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(scene.points).toHaveLength(2);
    expect(scene.points[0]).toMatchObject({ x: 1, y: 19 });
  });

  it('accepts x/y accessors', () => {
    type Row = { a: number; b: number };
    const scene = scatter([{ a: 0, b: 0 }, { a: 10, b: 10 }], {
      x: (r: Row) => r.a,
      y: (r: Row) => r.b,
    });
    expect(scene.points).toHaveLength(2);
  });

  it('renders an empty scene for empty data', () => {
    expect(scatter([]).marks).toEqual([]);
  });
});
