import { describe, it, expect } from 'vitest';
import { winLoss } from '../../src/charts/win-loss';

describe('winLoss', () => {
  it('draws uniform-height bars above/below the center baseline', () => {
    const scene = winLoss([1, -2, 3, -1]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // height 20, center = 10, pad 1 -> barHeight = center - top = 9
    // win (value 1): y = 1, height = 9 (top half)
    expect(rects[0]).toMatchObject({ y: 1, height: 9 });
    // loss (value -2): y = 10, height = 9 (bottom half)
    expect(rects[1]).toMatchObject({ y: 10, height: 9 });
  });

  it('renders zero as a thin center tick', () => {
    const scene = winLoss([0]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[0]!.height).toBeLessThan(2);
    expect(rects[0]!.y).toBeCloseTo(9.5, 5);
  });

  it('exposes one point per bar', () => {
    expect(winLoss([1, -1]).points).toHaveLength(2);
  });

  it('renders an empty scene for empty data', () => {
    expect(winLoss([]).marks).toEqual([]);
  });
});
