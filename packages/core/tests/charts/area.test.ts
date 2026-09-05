import { describe, it, expect } from 'vitest';
import { area } from '../../src/charts/area';

describe('area', () => {
  it('produces a filled path to the baseline plus a top stroke', () => {
    const scene = area([0, 10, 5]);
    const path = scene.marks.find((m) => m.type === 'path');
    const poly = scene.marks.find((m) => m.type === 'polyline');
    expect(path).toEqual({
      type: 'path',
      d: 'M1,19 L1,19 L50,1 L99,10 L99,19 Z',
      fill: 'currentColor',
      fillOpacity: 0.2,
      stroke: 'none',
    });
    expect(poly).toMatchObject({ type: 'polyline', points: [[1, 19], [50, 1], [99, 10]] });
  });

  it('exposes the same points as line', () => {
    expect(area([0, 10, 5]).points.map((p) => [p.x, p.y])).toEqual([[1, 19], [50, 1], [99, 10]]);
  });

  it('renders an empty scene for empty data', () => {
    expect(area([]).marks).toEqual([]);
  });

  it('renders a single data point as a dot', () => {
    const scene = area([5]);
    expect(scene.marks.filter((m) => m.type === 'path')).toHaveLength(0);
    expect(scene.marks.filter((m) => m.type === 'circle')).toHaveLength(1);
    expect(scene.points).toHaveLength(1);
  });
});
