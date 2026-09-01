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

describe('donut (full circle)', () => {
  // A single 100% segment (or a full gauge) must render a real ring, not a
  // collapsed zero-area arc. The ring path is split into half-sweeps so the
  // intermediate endpoints stay distinct even at 360 degrees.
  const arcCount = (d: string) => (d.match(/A/g) ?? []).length;

  it('renders a single full segment as a non-degenerate split ring', () => {
    const scene = donut([{ id: 'a', label: 'A', value: 1 }]);
    const path = scene.marks.find((m) => m.type === 'path')!;
    expect(arcCount(path.d)).toBe(4); // 2 outer half-arcs + 2 inner half-arcs
    // tokens: ["M{start}", "A{ro},{ro}", "0", "0", "1", "{outerMid}", ...]
    const tokens = path.d.split(' ');
    const start = tokens[0]!.slice(1); // strip leading "M"
    const outerMid = tokens[5]!;
    expect(outerMid).not.toBe(start); // the arc actually spans area
  });

  it('renders a full gauge (value == max) as a non-degenerate ring', () => {
    const scene = donut({ value: 100, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    const valueArc = paths[paths.length - 1]!;
    expect(arcCount(valueArc.d)).toBe(4);
  });
});

describe('donut (edges)', () => {
  it('renders an empty scene for an empty segment list', () => {
    expect(donut([]).marks).toEqual([]);
  });
});
