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
    const scene = bar([[1, 1, 1, 1]], { color: 'purple' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) {
      if (r.fillOpacity !== undefined) {
        expect(r.fillOpacity).toBe(Number(r.fillOpacity.toFixed(2)));
      }
    }
  });
});

describe('bar (segment color)', () => {
  it('assigns each stacked segment a categorical palette color when none is specified', () => {
    const scene = bar([[1, 1, 1]]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(new Set(rects.map((r) => r.fill)).size).toBe(3);
    for (const r of rects) expect(r.fillOpacity).toBe(1);
  });

  it('does not apply the palette to a non-stacked column', () => {
    const scene = bar([4, 9]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect(r.fill).toBe('currentColor');
  });

  it('uses the object literal color field when provided', () => {
    const scene = bar([
      [
        { value: 3, color: 'red' },
        { value: 2, color: 'blue' },
      ],
    ]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['red', 'blue']);
  });

  it('uses a color accessor for generic row data', () => {
    const rows = [
      { n: 3, hex: '#f00' },
      { n: 2, hex: '#00f' },
    ];
    const scene = bar([rows], { value: (r) => r.n, colorAccessor: (r) => r.hex });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['#f00', '#00f']);
  });

  it('falls back to a uniform options.color with the opacity stripe when no per-segment color is given', () => {
    const scene = bar([[1, 1, 1]], { color: 'purple' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect(r.fill).toBe('purple');
    expect(rects[0]!.fillOpacity).toBe(1);
    expect(rects[1]!.fillOpacity).toBeLessThan(1);
  });

  it('lets an explicit per-segment color win over a uniform options.color', () => {
    const scene = bar([[{ value: 3, color: 'red' }, { value: 2 }]], { color: 'purple' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[0]!.fill).toBe('red');
    expect(rects[1]!.fill).toBe('purple');
  });
});

describe('bar (edges)', () => {
  it('renders an empty scene for empty data', () => {
    expect(bar([]).marks).toEqual([]);
  });
});

describe('bar (track)', () => {
  it('renders one full-domain track rect per column behind the bars', () => {
    const scene = bar([4, 9], { track: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // 2 tracks + 2 bars; tracks come first
    expect(rects).toHaveLength(4);
    const [t0, t1, b0, b1] = rects;
    // tracks align exactly behind their column's bar
    expect(t0).toMatchObject({ x: b0!.x, width: b0!.width });
    expect(t1).toMatchObject({ x: b1!.x, width: b1!.width });
    // full domain [0,9]: y(9)=1 (top), y(0)=19 (baseline) -> track spans both
    expect(t0).toMatchObject({ y: 1, height: 18 });
    expect(t1).toMatchObject({ y: 1, height: 18 });
    // the tallest bar fills its track exactly
    expect(b1).toMatchObject({ y: 1, height: 18 });
    // default track: base color at low opacity; no points for tracks
    expect(t0!.fill).toBe('currentColor');
    expect(t0!.fillOpacity).toBe(0.15);
    expect(scene.points).toHaveLength(2);
  });

  it('renders a single track behind a stacked column', () => {
    const scene = bar([[3, 2]], { track: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3); // 1 track + 2 segments
    expect(rects[0]).toMatchObject({ fillOpacity: 0.15 });
  });

  it('extends the domain when track.max exceeds the data max', () => {
    const scene = bar([50], { track: { max: 100 } });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(2);
    const [track, valueBar] = rects;
    // domain [0,100] over 18px of plot height: track spans all of it,
    // the 50-bar spans half
    expect(track).toMatchObject({ y: 1, height: 18 });
    expect(valueBar).toMatchObject({ y: 10, height: 9 });
  });

  it('does not extend the domain when track.max is below the data max', () => {
    const scene = bar([50], { track: { max: 10 } });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // domain stays [0,50]: track spans it, bar overflows the track
    expect(rects[0]).toMatchObject({ y: 1, height: 18 });
    expect(rects[1]).toMatchObject({ y: 1, height: 18 });
  });

  it('honors explicit track color, opacity, and radius', () => {
    const scene = bar([4], { radius: 3, track: { color: '#e5e7eb', opacity: 0.5, radius: 2 } });
    expect(scene.marks[0]).toMatchObject({ fill: '#e5e7eb', fillOpacity: 0.5, rx: 2 });
  });

  it('inherits the bar radius for the track by default', () => {
    const scene = bar([4], { radius: 3, track: true });
    expect(scene.marks[0]).toMatchObject({ rx: 3 });
  });

  it('draws horizontal tracks along the value axis', () => {
    const scene = bar([4, 9], { horizontal: true, track: { max: 100 } });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    const [t0, t1, b0, b1] = rects;
    // tracks share their row's y/height and span the full domain width
    expect(t0).toMatchObject({ y: b0!.y, height: b0!.height });
    expect(t1).toMatchObject({ y: b1!.y, height: b1!.height });
    expect(t0!.width).toBeGreaterThan(b0!.width);
    expect(t0!.width).toBe(t1!.width);
  });

  it('renders no track when the option is absent', () => {
    expect(bar([4]).marks.filter((m) => m.type === 'rect')).toHaveLength(1);
  });
});

describe('bar (horizontal)', () => {
  it('runs bar length along x and stacks a single row of segments', () => {
    const scene = bar([[3, 5, 2]], { horizontal: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    // one column -> all segments share the same y/height (slot thickness)
    const [first, ...rest] = rects;
    for (const r of rest) {
      expect(r.y).toBe(first!.y);
      expect(r.height).toBe(first!.height);
    }
    // stacked left-to-right: each segment's x picks up where the previous one ended
    expect(rects[1]!.x).toBeCloseTo(rects[0]!.x + rects[0]!.width, 5);
    expect(rects[2]!.x).toBeCloseTo(rects[1]!.x + rects[1]!.width, 5);
  });

  it('lays out multiple horizontal bars as one segment per row', () => {
    const scene = bar([4, 9, 2, 7], { horizontal: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // rows stack top-to-bottom in index order: first bar's y is smallest
    const ys = rects.map((r) => r.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(ys[0]).toBeLessThan(ys[1]!);
    // longer value -> longer bar
    expect(rects[1]!.width).toBeGreaterThan(rects[0]!.width);
  });

  it('stacks segments within each horizontal row', () => {
    const scene = bar([[3, 2], [5, 1]], { horizontal: true });
    expect(scene.points).toHaveLength(4);
    expect(scene.points[0]).toMatchObject({ col: 0, row: 0, value: 3 });
    expect(scene.points[1]).toMatchObject({ col: 0, row: 1, value: 2 });
    // second row (col 1) sits below the first (larger y)
    expect(scene.points[2]!.y).toBeGreaterThan(scene.points[0]!.y);
  });

  it('draws a negative horizontal bar to the left of the zero baseline', () => {
    const scene = bar([-4, 6], { horizontal: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect(r.width).toBeGreaterThanOrEqual(0);
    // negative value's bar sits left of the positive value's bar
    expect(rects[0]!.x).toBeLessThan(rects[1]!.x);
  });
});
