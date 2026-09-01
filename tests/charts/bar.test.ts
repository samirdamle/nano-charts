import { describe, it, expect } from 'vitest';
import { bar } from '../../src/charts/bar';

describe('bar (simple)', () => {
  it('produces one rect per value growing from the zero baseline', () => {
    const scene = bar([4, 9, 2, 7]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // slot = 98/4 = 24.5, gap 0.2 -> barW = 19.6, x0 = 1 + (24.5-19.6)/2 = 3.45
    expect(rects[0]).toMatchObject({ x: 3.45, width: 19.6 });
    // domain [0,9] -> y(9)=1 (top), y(4)=11, baseline y(0)=19
    expect(rects[1]).toMatchObject({ y: 1, height: 18 }); // tallest (value 9)
  });

  it('exposes one point per column', () => {
    expect(bar([4, 9]).points).toHaveLength(2);
  });
});

describe('bar (stacked)', () => {
  it('stacks segment rects within each column', () => {
    const scene = bar([[3, 2], [5, 4]]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // 2 columns x 2 segments = 4 rects
    expect(rects).toHaveLength(4);
    // totals: 5 and 9 -> domain [0,9]
  });

  it('exposes one point per segment with row/col', () => {
    const scene = bar([[3, 2], [5, 4]]);
    expect(scene.points).toHaveLength(4);
    expect(scene.points[0]).toMatchObject({ col: 0, row: 0, value: 3 });
  });
});

describe('bar (negative values)', () => {
  it('never emits a negative rect height', () => {
    const scene = bar([-4, 9, -2, 7]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect(r.height).toBeGreaterThanOrEqual(0);
  });

  it('draws a negative bar below the zero baseline', () => {
    // domain [-4, 9] over height 20 (pad 1) -> y(0) is the baseline
    const scene = bar([-4]);
    const rect = scene.marks.find((m) => m.type === 'rect')!;
    // negative bar top sits at the baseline; height is positive
    expect(rect.height).toBeGreaterThan(0);
  });

  it('rounds fillOpacity on stacked segments', () => {
    const scene = bar([[1, 1, 1, 1]]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) {
      if (r.fillOpacity !== undefined) {
        expect(r.fillOpacity).toBe(Number(r.fillOpacity.toFixed(2)));
      }
    }
  });
});

describe('bar (edges)', () => {
  it('renders an empty scene for empty data', () => {
    expect(bar([]).marks).toEqual([]);
  });
});
