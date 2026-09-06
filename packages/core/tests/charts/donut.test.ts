import { describe, it, expect } from 'vitest';
import { donut } from '../../src/charts/donut';

describe('donut (gauge)', () => {
  it('draws a track arc plus a value arc, both stroked and unfilled', () => {
    const scene = donut({ value: 75, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2); // track + value
    for (const p of paths) {
      expect(p).toMatchObject({ fill: 'none' });
      expect(p.stroke).toBeTruthy();
      expect(p.strokeWidth).toBeGreaterThan(0);
    }
    expect(scene.width).toBe(20);
    expect(scene.height).toBe(20);
  });

  it('summarizes the gauge percentage', () => {
    expect(donut({ value: 75, max: 100 }).a11y.desc).toContain('75');
  });
});

describe('donut (segments)', () => {
  it('draws one stroked, unfilled arc per segment', () => {
    const scene = donut([{ id: 'a', label: 'A', value: 3 }, { id: 'b', label: 'B', value: 1 }]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    for (const p of paths) expect(p).toMatchObject({ fill: 'none' });
    expect(scene.points).toHaveLength(2);
  });
});

describe('donut (full circle)', () => {
  // A single 100% segment (or a full gauge) must render a real ring, not a
  // collapsed zero-area arc. The arc is split into half-sweeps so the
  // intermediate endpoints stay distinct even at 360 degrees.
  const arcCount = (d: string) => (d.match(/A/g) ?? []).length;

  it('renders a single full segment as a non-degenerate split arc', () => {
    const scene = donut([{ id: 'a', label: 'A', value: 1 }]);
    const path = scene.marks.find((m) => m.type === 'path')!;
    expect(arcCount(path.d)).toBe(2); // 2 half-arcs along the mid-radius
    // tokens: ["M{start}", "A{r},{r}", "0", "0", "1", "{mid}", ...]
    const tokens = path.d.split(' ');
    const start = tokens[0]!.slice(1); // strip leading "M"
    const mid = tokens[5]!;
    expect(mid).not.toBe(start); // the arc actually spans area
  });

  it('renders a full gauge (value == max) as a non-degenerate ring', () => {
    const scene = donut({ value: 100, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    const valueArc = paths[paths.length - 1]!;
    expect(arcCount(valueArc.d)).toBe(2);
  });
});

describe('donut (edges)', () => {
  it('renders an empty scene for an empty segment list', () => {
    expect(donut([]).marks).toEqual([]);
  });
});

describe('donut (segment color)', () => {
  it('assigns each segment a categorical palette color when none is specified', () => {
    const scene = donut([1, 1, 1, 1]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map((p) => p.stroke)).toEqual([
      'hsl(0, 60%, 30%)',
      'hsl(90, 60%, 70%)',
      'hsl(180, 60%, 30%)',
      'hsl(270, 60%, 70%)',
    ]);
  });

  it('suppresses the opacity stripe when segments use palette colors', () => {
    const scene = donut([1, 1]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.every((p) => p.strokeOpacity === undefined || p.strokeOpacity === 1)).toBe(true);
  });

  it('uses the object literal color field when provided', () => {
    const scene = donut([
      { value: 1, color: 'red' },
      { value: 1, color: 'blue' },
    ]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map((p) => p.stroke)).toEqual(['red', 'blue']);
  });

  it('uses a color accessor for generic row data', () => {
    const rows = [
      { rev: 1, hex: '#111' },
      { rev: 1, hex: '#222' },
    ];
    const scene = donut(rows, { value: (r) => r.rev, colorAccessor: (r) => r.hex });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map((p) => p.stroke)).toEqual(['#111', '#222']);
  });

  it('applies options.colors[] by index when no per-segment color is given', () => {
    const scene = donut([1, 1, 1], { colors: ['red', 'green', 'blue'] });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map((p) => p.stroke)).toEqual(['red', 'green', 'blue']);
  });

  it('lets an explicit per-segment color win over options.colors[i]', () => {
    const scene = donut([{ value: 1, color: 'red' }, { value: 1 }], { colors: ['ignored', 'green'] });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map((p) => p.stroke)).toEqual(['red', 'green']);
  });

  it('falls back to a uniform options.color with the opacity stripe when no per-segment color is given', () => {
    const scene = donut([1, 1, 1], { color: 'purple' });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.every((p) => p.stroke === 'purple')).toBe(true);
    expect(paths.map((p) => p.strokeOpacity)).toEqual([1, 0.55, 1]);
  });
});
