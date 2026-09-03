import { describe, it, expect } from 'vitest';
import { lines } from '../../src/charts/lines';

describe('lines', () => {
  it('overlays multiple series on one shared y-scale', () => {
    const scene = lines([{ data: [0, 10] }, { data: [5, 5] }]);
    const polylines = scene.marks.filter((m) => m.type === 'polyline');
    expect(polylines).toHaveLength(2);
    expect(polylines[0]).toMatchObject({
      points: [
        [1, 19],
        [99, 1],
      ],
    });
    expect(polylines[1]).toMatchObject({
      points: [
        [1, 10],
        [99, 10],
      ],
    });
  });

  it('applies per-series color, strokeWidth, strokeDasharray and strokeLinecap', () => {
    const scene = lines([
      { data: [0, 10], color: 'red', strokeWidth: 2.5 },
      { data: [0, 10], color: 'blue', strokeDasharray: [3, 2], strokeLinecap: 'round' },
    ]);
    const [a, b] = scene.marks.filter((m) => m.type === 'polyline');
    expect(a).toMatchObject({ stroke: 'red', strokeWidth: 2.5 });
    expect(b).toMatchObject({ stroke: 'blue', strokeDasharray: '3 2', strokeLinecap: 'round' });
  });

  it('tags points with seriesIndex and seriesLabel', () => {
    const scene = lines([
      { data: [1, 2], name: 'Actual' },
      { data: [3, 4], name: 'Target' },
    ]);
    expect(scene.points.map((p) => [p.seriesIndex, p.seriesLabel])).toEqual([
      [0, 'Actual'],
      [0, 'Actual'],
      [1, 'Target'],
      [1, 'Target'],
    ]);
  });

  it('tags dot circles with a global point index and seriesIndex', () => {
    const scene = lines([
      { data: [1, 2], dot: 'all' },
      { data: [3, 4], dot: 'all' },
    ]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles.map((c) => [c.index, c.seriesIndex])).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]);
  });

  it('renders an empty scene when there are no series', () => {
    const scene = lines([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
  });

  it('renders a lone point in a series as a dot', () => {
    const scene = lines([{ data: [5] }, { data: [1, 9] }]);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ seriesIndex: 0 });
  });
});
