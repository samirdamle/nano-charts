import { describe, it, expect } from 'vitest';
import { radar } from '../../src/charts/radar';
import { categoricalColor } from '../../src/core/palette';

describe('radar', () => {
  it('returns an empty scene for empty input', () => {
    const scene = radar([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
    expect(scene.a11y.desc).toBe('radar chart, no data');
  });

  it('lays vertices on a shared radial scale starting at the top', () => {
    // 100x100 canvas, no padding: center (50,50), radius 50.
    const scene = radar([{ data: [4, 2] }], { grid: false, padding: 0 });
    expect(scene.points.map((p) => [p.x, p.y])).toEqual([
      [50, 0], // axis 0 at -90°: full radius (4/4)
      [50, 75], // axis 1 at +90°: half radius (2/4)
    ]);
  });

  it('accepts a single-series shorthand', () => {
    const scene = radar([1, 2, 3, 4], { grid: false });
    expect(scene.points).toHaveLength(4);
    expect(scene.points[0]).toMatchObject({ seriesIndex: 0, value: 1 });
    const polys = scene.marks.filter((m) => m.type === 'polyline');
    expect(polys).toHaveLength(1);
    // Closed polygon: first vertex repeated at the end.
    expect(polys[0]!.points[0]).toEqual(polys[0]!.points[polys[0]!.points.length - 1]);
  });

  it('supports accessor objects in shorthand form', () => {
    const scene = radar([{ v: 3 }, { v: 1 }], { value: (d) => d.v, grid: false });
    expect(scene.points.map((p) => p.value)).toEqual([3, 1]);
  });

  it('treats an object array with an array-valued `data` field as series', () => {
    const scene = radar(
      [
        { data: [1, 2], name: 'A' },
        { data: [3, 4], name: 'B' },
      ],
      { grid: false },
    );
    expect(scene.points.map((p) => p.seriesLabel)).toEqual(['A', 'A', 'B', 'B']);
  });

  it('overlays multiple series with categorical palette colors by default', () => {
    const scene = radar([{ data: [1, 1, 1] }, { data: [2, 2, 2] }], { grid: false });
    const strokes = scene.marks
      .filter((m) => m.type === 'polyline')
      .map((m) => (m as { stroke?: string }).stroke);
    expect(strokes).toEqual([categoricalColor(0, 2), categoricalColor(1, 2)]);
  });

  it('prefers explicit series color, then a uniform option color', () => {
    const scene = radar([{ data: [1, 1], color: 'red' }, { data: [1, 1] }], {
      color: 'blue',
      grid: false,
    });
    const strokes = scene.marks
      .filter((m) => m.type === 'polyline')
      .map((m) => (m as { stroke?: string }).stroke);
    expect(strokes).toEqual(['red', 'blue']);
  });

  it('draws a decorative grid by default and hides it with grid: false', () => {
    const withGrid = radar([{ data: [1, 1, 1] }]);
    const grids = withGrid.marks.filter(
      (m) => m.type === 'path' && (m as { strokeOpacity?: number }).strokeOpacity === 0.15,
    );
    // 3 spokes + 4 rings.
    expect(grids).toHaveLength(7);
    const noGrid = radar([{ data: [1, 1, 1] }], { grid: false });
    expect(noGrid.marks.some((m) => m.type === 'path' && 'strokeOpacity' in m)).toBe(false);
  });

  it('fills polygons at 0.2 opacity by default; fill variants', () => {
    const scene = radar([{ data: [1, 2, 3] }], { grid: false });
    const fills = scene.marks.filter((m) => m.type === 'path' && 'fillOpacity' in m);
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ fillOpacity: 0.2 });

    const off = radar([{ data: [1, 2, 3], fill: false }], { grid: false });
    expect(off.marks.some((m) => m.type === 'path' && 'fillOpacity' in m)).toBe(false);

    const custom = radar([{ data: [1, 2, 3], fill: 0.5 }], { grid: false });
    expect(custom.marks.filter((m) => m.type === 'path' && 'fillOpacity' in m)[0]).toMatchObject({
      fillOpacity: 0.5,
    });
  });

  it('clamps negative and non-finite values to the center for layout', () => {
    const scene = radar([{ data: [-5, Number.NaN, 4] }], { grid: false, padding: 0 });
    // 100x100 canvas: center (50,50).
    expect(scene.points[0]).toMatchObject({ x: 50, y: 50, value: -5 });
    expect(scene.points[1]).toMatchObject({ x: 50, y: 50 });
    expect(scene.points[2]!.y).toBeGreaterThan(50); // full radius at 150°, below center
  });

  it('pads shorter series with zeros up to the axis count', () => {
    const scene = radar([{ data: [4, 4, 4] }, { data: [4] }], { grid: false });
    const second = scene.points.filter((p) => p.seriesIndex === 1);
    expect(second).toHaveLength(3);
    expect(second[1]).toMatchObject({ x: 50, y: 50, value: 0 });
    expect(second[2]).toMatchObject({ x: 50, y: 50, value: 0 });
  });

  it('honors a custom max domain', () => {
    const scene = radar([{ data: [2, 2] }], { max: 4, grid: false, padding: 0 });
    // Half radius: 25px from center.
    expect(scene.points[0]).toMatchObject({ x: 50, y: 25 });
  });

  it('clamps values above an explicit max to the outer radius', () => {
    const scene = radar([{ data: [10, 2] }], { max: 4, grid: false, padding: 0 });
    // 10 exceeds max 4 → pinned to the outer ring; raw value kept on the point.
    expect(scene.points[0]).toMatchObject({ x: 50, y: 0, value: 10 });
    expect(scene.points[1]).toMatchObject({ x: 50, y: 75, value: 2 });
  });

  it('falls back to the data max for a non-finite or negative max', () => {
    for (const max of [Number.NaN, -3]) {
      const scene = radar([{ data: [2, 2] }], { max, grid: false, padding: 0 });
      expect(scene.points[0]).toMatchObject({ x: 50, y: 0 });
    }
  });

  it('avoids division by zero when everything is zero', () => {
    const scene = radar([{ data: [0, 0, 0] }], { grid: false, padding: 0 });
    expect(scene.points.every((p) => p.x === 50 && p.y === 50)).toBe(true);
    expect(scene.marks.length).toBeGreaterThan(0);
  });

  it('renders a single axis as a dot', () => {
    const scene = radar([{ data: [3] }], { grid: false, padding: 0 });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ cx: 50, cy: 0 });
  });

  it('draws vertex dots with dot: all', () => {
    const scene = radar([{ data: [1, 2, 3], dot: 'all', dotRadius: 2 }], { grid: false });
    const dots = scene.marks.filter((m) => m.type === 'circle');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toMatchObject({ r: 2 });
  });

  it('applies strokeDasharray and strokeLinecap to the polygon stroke', () => {
    const scene = radar([{ data: [1, 2, 3], strokeDasharray: [4, 2], strokeLinecap: 'round' }], {
      grid: false,
    });
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(poly).toMatchObject({ strokeDasharray: '4 2', strokeLinecap: 'round' });
  });

  it('tags points with seriesIndex and seriesLabel for interactions', () => {
    const scene = radar(
      [
        { data: [1, 2], name: 'Actual' },
        { data: [3, 4], name: 'Target' },
      ],
      { grid: false },
    );
    expect(scene.points.map((p) => [p.seriesIndex, p.seriesLabel, p.index])).toEqual([
      [0, 'Actual', 0],
      [0, 'Actual', 1],
      [1, 'Target', 0],
      [1, 'Target', 1],
    ]);
    expect(scene.a11y.desc).toBe('radar chart, 2 series, 2 axes');
  });
});
