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

describe('scatter (per-point color)', () => {
  it('paints each point with its own color from the object form', () => {
    const scene = scatter([
      { x: 0, y: 0, color: 'red' },
      { x: 10, y: 10, color: 'blue' },
    ]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles[0]).toMatchObject({ fill: 'red' });
    expect(circles[1]).toMatchObject({ fill: 'blue' });
  });

  it('falls back to the uniform color when a point has none', () => {
    const scene = scatter([{ x: 0, y: 0 }, { x: 10, y: 10, color: 'blue' }], {
      color: 'green',
    });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles[0]).toMatchObject({ fill: 'green' });
    expect(circles[1]).toMatchObject({ fill: 'blue' });
  });

  it('keeps the default currentColor fill for colorless points', () => {
    const scene = scatter([[0, 0], [10, 10]]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    for (const c of circles) expect(c).toMatchObject({ fill: 'currentColor' });
  });

  it('supports a color accessor alongside x/y accessors', () => {
    type Row = { a: number; b: number; c: string };
    const scene = scatter(
      [
        { a: 0, b: 0, c: 'red' },
        { a: 10, b: 10, c: 'blue' },
      ],
      {
        x: (r: Row) => r.a,
        y: (r: Row) => r.b,
        colorAccessor: (r: Row) => r.c,
      },
    );
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles[0]).toMatchObject({ fill: 'red' });
    expect(circles[1]).toMatchObject({ fill: 'blue' });
  });

  it('treats an undefined accessor result as no per-point color', () => {
    const scene = scatter([{ x: 0, y: 0 }], {
      x: (r) => r.x,
      y: (r) => r.y,
      colorAccessor: () => undefined,
    });
    expect(scene.marks[0]).toMatchObject({ type: 'circle', fill: 'currentColor' });
  });
});
