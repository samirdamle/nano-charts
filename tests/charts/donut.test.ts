import { describe, it, expect } from 'vitest';
import { donut } from '../../src/charts/donut';

describe('donut (gauge)', () => {
  it('draws a track arc plus a value arc', () => {
    const scene = donut({ value: 75, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2); // track + value
    expect(scene.width).toBe(20);
    expect(scene.height).toBe(20);
  });

  it('summarizes the gauge percentage', () => {
    expect(donut({ value: 75, max: 100 }).a11y.desc).toContain('75');
  });
});

describe('donut (segments)', () => {
  it('draws one arc per segment', () => {
    const scene = donut([{ id: 'a', label: 'A', value: 3 }, { id: 'b', label: 'B', value: 1 }]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    expect(scene.points).toHaveLength(2);
  });
});

describe('donut (edges)', () => {
  it('renders an empty scene for an empty segment list', () => {
    expect(donut([]).marks).toEqual([]);
  });
});
