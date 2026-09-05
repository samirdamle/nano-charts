import { describe, it, expect } from 'vitest';
import { line } from '../../src/charts/line';

describe('line', () => {
  it('produces a polyline through scaled points', () => {
    const scene = line([0, 10, 5]);
    expect(scene.viewBox).toBe('0 0 100 20');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(poly).toEqual({
      type: 'polyline',
      points: [[1, 19], [50, 1], [99, 10]],
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1,
    });
  });

  it('exposes data-bound points for interactivity', () => {
    const scene = line([0, 10, 5]);
    expect(scene.points).toEqual([
      { id: 0, label: '0', value: 0, index: 0, x: 1, y: 19 },
      { id: 1, label: '10', value: 10, index: 1, x: 50, y: 1 },
      { id: 2, label: '5', value: 5, index: 2, x: 99, y: 10 },
    ]);
  });

  it('adds only the last dot when dot="last"', () => {
    const scene = line([0, 10, 5], { dot: 'last' });
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toMatchObject({ cx: 99, cy: 10 });
  });

  it('accepts accessors', () => {
    const scene = line([{ v: 0 }, { v: 10 }], { value: (r: { v: number }) => r.v });
    expect(scene.points.map((p) => p.value)).toEqual([0, 10]);
  });

  it('generates an a11y summary', () => {
    expect(line([0, 10, 5]).a11y.desc).toBe('line chart, 3 points, trend up, min 0, max 10');
  });

  it('renders an empty scene for empty data', () => {
    const scene = line([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
  });

  it('renders a single data point as a dot (no invisible polyline)', () => {
    const scene = line([5]);
    expect(scene.marks.filter((m) => m.type === 'polyline')).toHaveLength(0);
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles).toHaveLength(1);
    expect(scene.points).toHaveLength(1);
  });
});
