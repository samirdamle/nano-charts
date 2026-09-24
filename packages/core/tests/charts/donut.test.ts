import { describe, it, expect } from 'vitest';
import { donut } from '../../src/charts/donut';
import { arcPath } from '../../src/core/geometry';

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

describe('donut (track)', () => {
  it('draws an opt-in full ring behind segmented arcs', () => {
    const scene = donut([3, 1], { track: true });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(3); // track + 2 segments
    const [track, ...segs] = paths;
    // full 360° ring: two half-arcs, same thickness as the segments
    expect((track!.d.match(/A/g) ?? []).length).toBe(2);
    expect(track).toMatchObject({ fill: 'none', stroke: 'currentColor', strokeOpacity: 0.25 });
    expect(track!.strokeWidth).toBe(segs[0]!.strokeWidth);
    // decorative: no points for the track
    expect(scene.points).toHaveLength(2);
  });

  it('honors explicit track color and opacity on segments', () => {
    const scene = donut([3, 1], { track: { color: '#e5e7eb', opacity: 0.5 } });
    const track = scene.marks.find((m) => m.type === 'path')!;
    expect(track).toMatchObject({ stroke: '#e5e7eb', strokeOpacity: 0.5 });
  });

  it('draws no track for segments by default', () => {
    const scene = donut([3, 1]);
    expect(scene.marks.filter((m) => m.type === 'path')).toHaveLength(2);
  });

  it('draws no track for empty segment data', () => {
    expect(donut([], { track: true }).marks).toEqual([]);
  });

  it('keeps the gauge background ring by default', () => {
    const scene = donut({ value: 75, max: 100 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatchObject({ strokeOpacity: 0.25 });
  });

  it('hides the gauge background ring with track: false', () => {
    const scene = donut({ value: 75, max: 100 }, { track: false });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(1); // value arc only
  });

  it('customizes the gauge background ring via the track option', () => {
    const scene = donut({ value: 75, max: 100 }, { track: { color: 'red', opacity: 0.3 } });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths[0]).toMatchObject({ stroke: 'red', strokeOpacity: 0.3 });
    // value arc untouched
    expect(paths[1]!.strokeOpacity).toBeUndefined();
  });
});

describe('donut (round caps)', () => {
  it('applies strokeLinecap to every segment arc when set', () => {
    const scene = donut([1, 1, 1], { strokeLinecap: 'round' });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.every((p) => p.strokeLinecap === 'round')).toBe(true);
  });

  it('applies strokeLinecap to both gauge arcs when set', () => {
    const scene = donut({ value: 75, max: 100 }, { strokeLinecap: 'round' });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    expect(paths.every((p) => p.strokeLinecap === 'round')).toBe(true);
  });

  it('omits strokeLinecap when not set', () => {
    const scene = donut([1, 1, 1]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.every((p) => p.strokeLinecap === undefined)).toBe(true);
  });
});

describe('donut (clamp policy)', () => {
  it('treats negative segment values as zero — no negative sweeps', () => {
    const scene = donut([
      { id: 'a', label: 'A', value: -5 },
      { id: 'b', label: 'B', value: 10 },
    ]);
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    for (const p of paths) expect((p as { d: string }).d).not.toContain('NaN');
    // points keep raw values for datum identity
    expect(scene.points.map((p) => p.value)).toEqual([-5, 10]);
  });

  it('renders no segments when every value is negative', () => {
    const scene = donut([{ value: -3 }, { value: -1 }]);
    expect(scene.marks).toHaveLength(0);
  });
});

describe('donut (endAngle)', () => {
  it('spans a partial dial in gauge mode', () => {
    const scene = donut({ value: 50, max: 100 }, { startAngle: 135, endAngle: 405 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2); // track + value arc
    // value arc ends halfway across the 270° dial (at 270°)
    const d = (paths[1] as { d: string }).d;
    expect(d.split(' ').pop()).toBe('10,1.75');
  });

  it('scales segment sweeps to the partial span', () => {
    const scene = donut([1, 1], { startAngle: 0, endAngle: 180, gap: 0 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    // each segment sweeps 90°: first ends at 90° (bottom, y-down), on the mid-radius
    expect((paths[0] as { d: string }).d.split(' ').pop()).toBe('10,18.25');
  });

  it('falls back to the full circle on a bad endAngle', () => {
    const scene = donut({ value: 100, max: 100 }, { endAngle: -90 });
    const paths = scene.marks.filter((m) => m.type === 'path');
    // full-circle track renders as a split arc (2 half-sweeps)
    expect(((paths[0] as { d: string }).d.match(/A/g) ?? []).length).toBe(2);
  });
});

describe('donut (centerLabel)', () => {
  it('renders a literal string at the dial center in gauge mode', () => {
    const scene = donut({ value: 72, max: 100 }, { centerLabel: '72%' });
    const label = scene.marks.find((m) => m.type === 'text');
    expect(label).toMatchObject({
      x: 10,
      y: 11.05, // cy + fontSize(3) * 0.35 baseline nudge
      fontSize: 3,
      fontWeight: 600,
      text: '72%',
      textAnchor: 'middle',
    });
  });

  it('passes { value, min: 0, max, frac } to a formatter in gauge mode', () => {
    const seen: unknown[] = [];
    donut({ value: 75, max: 150 }, { centerLabel: (ctx) => (seen.push({ ...ctx }), 'x') });
    expect(seen).toEqual([{ value: 75, min: 0, max: 150, frac: 0.5 }]);
  });

  it('passes the total as value in segmented mode', () => {
    const seen: unknown[] = [];
    donut([3, 1], { centerLabel: (ctx) => (seen.push({ ...ctx }), 'total') });
    expect(seen).toEqual([{ value: 4, min: 0, max: 4, frac: 1 }]);
  });

  it('omits the label by default', () => {
    expect(donut({ value: 50, max: 100 }).marks.some((m) => m.type === 'text')).toBe(false);
    expect(donut([1, 2]).marks.some((m) => m.type === 'text')).toBe(false);
  });
});

describe('donut (segment gap)', () => {
  const segPaths = (scene: ReturnType<typeof donut>) =>
    scene.marks.filter((m) => m.type === 'path').map((p) => (p as { d: string }).d);

  it('defaults to a 0.2-unit gap between segments', () => {
    expect(segPaths(donut([1, 1]))).toEqual(segPaths(donut([1, 1], { gap: 0.2 })));
  });

  it('draws full sweeps with gap: 0', () => {
    const [d] = segPaths(donut([1, 1], { gap: 0 }));
    // 20x20 canvas: cx = cy = 10, rMid = 10 - (10 * 0.35) / 2 = 8.25
    expect(d).toBe(arcPath(10, 10, 8.25, -90, 90));
    expect(d).not.toBe(segPaths(donut([1, 1]))[0]);
  });

  it('insets each segment symmetrically, including the wrap seam', () => {
    const [first, second] = segPaths(donut([1, 1], { gap: 2 }));
    const halfGapDeg = ((2 / 2) / 8.25) * (180 / Math.PI);
    expect(first).toBe(arcPath(10, 10, 8.25, -90 + halfGapDeg, 90 - halfGapDeg));
    expect(second).toBe(arcPath(10, 10, 8.25, 90 + halfGapDeg, 270 - halfGapDeg));
  });

  it('treats a negative gap as 0', () => {
    expect(segPaths(donut([1, 1], { gap: -2 }))).toEqual(segPaths(donut([1, 1], { gap: 0 })));
  });

  it('falls back to the default for a non-finite gap', () => {
    expect(segPaths(donut([1, 1], { gap: NaN }))).toEqual(segPaths(donut([1, 1])));
  });

  it('collapses a sub-gap segment to a zero-length arc instead of inverting', () => {
    const d = segPaths(donut([0.0001, 1], { gap: 5 }))[0] as string;
    const tokens = d.split(' ');
    const start = tokens[0]!.slice(1); // strip leading "M"
    const end = tokens[tokens.length - 1]!;
    expect(start).toBe(end);
  });

  it('ignores gap in gauge mode', () => {
    expect(segPaths(donut({ value: 75, max: 100 }, { gap: 5 }))).toEqual(
      segPaths(donut({ value: 75, max: 100 })),
    );
  });
});
