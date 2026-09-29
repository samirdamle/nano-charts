import { describe, it, expect } from 'vitest';
import { highlightMarks } from '../../src/core/highlight';
import { line } from '../../src/charts/line';
import { bar } from '../../src/charts/bar';
import { scatter } from '../../src/charts/scatter';
import { heatmap } from '../../src/charts/heatmap';
import type { Mark } from '../../src/types';

const box = { left: 10, top: 5, right: 90, bottom: 45 };
// y is inverted (larger data values map to smaller pixels), like a real chart.
const scales = { x: (v: number) => 10 + v * 8, y: (v: number) => 45 - v * 4 };

const rects = (marks: Mark[]) => marks.filter((m) => m.type === 'rect');

describe('highlightMarks', () => {
  it('returns no marks without zones', () => {
    expect(highlightMarks(undefined, scales, box)).toEqual([]);
  });

  it('accepts an array of zones', () => {
    expect(highlightMarks([{ x: [2, 5], color: 'red' }], scales, box)).toHaveLength(1);
  });

  it('spans the full plot height when only x is given', () => {
    expect(highlightMarks([{ x: [2, 5], color: 'red' }], scales, box)).toEqual([
      { type: 'rect', x: 26, y: 5, width: 24, height: 40, fill: 'red' },
    ]);
  });

  it('spans the full plot width when only y is given', () => {
    expect(highlightMarks([{ y: [2, 5], color: 'blue' }], scales, box)).toEqual([
      { type: 'rect', x: 10, y: 25, width: 80, height: 12, fill: 'blue' },
    ]);
  });

  it('draws an arbitrary rectangle when both are given', () => {
    expect(
      highlightMarks([{ x: [1, 3], y: [2, 6], color: 'green' }], scales, box),
    ).toEqual([{ type: 'rect', x: 18, y: 21, width: 16, height: 16, fill: 'green' }]);
  });

  it('normalizes reversed ranges', () => {
    expect(highlightMarks([{ x: [5, 2], y: [6, 2], color: 'red' }], scales, box)).toEqual(
      highlightMarks([{ x: [2, 5], y: [2, 6], color: 'red' }], scales, box),
    );
  });

  it('renders several zones in order', () => {
    const marks = highlightMarks(
      [
        { x: [0, 1], color: 'red' },
        { y: [0, 1], color: 'blue' },
      ],
      scales,
      box,
    );
    expect(marks).toHaveLength(2);
    expect(marks[0]).toMatchObject({ fill: 'red' });
    expect(marks[1]).toMatchObject({ fill: 'blue' });
  });

  it('clips zones that partly overlap the plot', () => {
    expect(highlightMarks([{ x: [-5, 3], color: 'red' }], scales, box)).toEqual([
      { type: 'rect', x: 10, y: 5, width: 24, height: 40, fill: 'red' },
    ]);
  });

  it('skips zones entirely outside the plot', () => {
    expect(highlightMarks([{ x: [20, 30], color: 'red' }], scales, box)).toEqual([]);
    expect(highlightMarks([{ y: [20, 30], color: 'red' }], scales, box)).toEqual([]);
  });

  it('skips zero-area zones', () => {
    expect(highlightMarks([{ x: [3, 3], color: 'red' }], scales, box)).toEqual([]);
  });
});

describe('highlight in charts', () => {
  it('line: draws the zone behind the data, x in index units', () => {
    const scene = line([10, 20, 30, 20], {
      width: 120,
      height: 40,
      padding: 4,
      highlights: [{ x: [1, 2], color: 'rgba(240,221,130,0.35)' }],
    });
    const [hl] = rects(scene.marks);
    // Plot is [4,116]x[4,36]; indices 0..3 map across it.
    expect(hl).toMatchObject({
      type: 'rect',
      x: 41.33,
      y: 4,
      width: 37.33,
      height: 32,
      fill: 'rgba(240,221,130,0.35)',
    });
    // The highlight zone is the very first mark, ahead of gridlines and data.
    expect(scene.marks[0]).toBe(hl);
    // Decorative: no points emitted.
    expect(scene.points).toHaveLength(4);
  });

  it('bar: x addresses bar centers, y is value-based', () => {
    const scene = bar([5, 10, 15], {
      width: 120,
      height: 40,
      padding: 4,
      highlights: [
        { x: [0, 1], color: 'red' },
        { y: [12, 20], color: 'blue' },
      ],
    });
    const [zx, zy] = rects(scene.marks);
    // Vertical bars: x zone spans bar centers 0..1, full plot height.
    expect(zx).toMatchObject({ y: 4, height: 32, fill: 'red' });
    expect(zx!.x).toBeCloseTo(22.67, 1);
    expect(zy).toMatchObject({ x: 4, width: 112, fill: 'blue' });
    // Value domain is [0,15] over [36,4]: y(12)=10.4, y(20) clips to 4.
    expect(zy).toMatchObject({ y: 4, height: 6.4 });
    expect(scene.marks[0]).toBe(zx);
  });

  it('bar horizontal: x is value-based, y addresses bar centers', () => {
    const scene = bar([5, 10, 15], {
      width: 120,
      height: 40,
      padding: 4,
      horizontal: true,
      highlights: [{ x: [5, 10], color: 'red' }],
    });
    const [hl] = rects(scene.marks);
    // Value domain [0,15] over [4,116]: x(5)=41.33, x(10)=78.67.
    expect(hl).toMatchObject({ x: 41.33, y: 4, width: 37.33, height: 32, fill: 'red' });
  });

  it('scatter: x and y are data values', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 20],
      ],
      {
        width: 100,
        height: 40,
        padding: 5,
        highlights: [{ x: [2, 8], y: [4, 16], color: 'blue' }],
      },
    );
    const [hl] = rects(scene.marks);
    // x [0,10] over [5,95]; y [0,20] over [35,5].
    expect(hl).toMatchObject({ x: 23, y: 11, width: 54, height: 18, fill: 'blue' });
    expect(scene.marks[0]).toBe(hl);
  });

  it('heatmap: x/y address cell centers', () => {
    const scene = heatmap(
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      { cellSize: 10, gap: 0, padding: 2, highlights: [{ x: [0, 1], color: 'red' }] },
    );
    const [hl] = rects(scene.marks);
    // Column centers at x=7 and x=17; full plot height [2,22].
    expect(hl).toMatchObject({ x: 7, y: 2, width: 10, height: 20, fill: 'red' });
    expect(scene.marks[0]).toBe(hl);
  });

  it('does not affect automatic padding', () => {
    const data = [10, 20, 15, 30, 25];
    const plain = line(data, { width: 120, height: 40 });
    const zoned = line(data, {
      width: 120,
      height: 40,
      highlights: [{ x: [-100, 100], y: [-100, 100], color: 'red' }],
    });
    const dataMarks = (s: typeof plain) =>
      s.marks.filter((m) => !(m.type === 'rect' && (m as { fill?: string }).fill === 'red'));
    expect(dataMarks(zoned)).toEqual(dataMarks(plain));
    expect(zoned.points).toEqual(plain.points);
  });
});
