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

describe('bar (grouped)', () => {
  it('places segments side by side within each column', () => {
    const scene = bar([[3, 6], [9, 2]], { mode: 'grouped' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // 2 columns: slot 49, barW 39.2; group of 2: sub-slot 19.6, subW 15.68
    // col 0 slot starts at 5.9 -> bars at 7.86 and 27.46
    expect(rects[0]).toMatchObject({ x: 7.86, width: 15.68 });
    expect(rects[1]).toMatchObject({ x: 27.46, width: 15.68 });
    // col 1 slot starts at 54.9 -> bars at 56.86 and 76.46
    expect(rects[2]).toMatchObject({ x: 56.86, width: 15.68 });
    expect(rects[3]).toMatchObject({ x: 76.46, width: 15.68 });
  });

  it('scales the domain to segment values, not column totals', () => {
    // totals would be 16 (stacked domain [0,16]); grouped domain is [0,8]
    const scene = bar([[8, 8]], { mode: 'grouped' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // each value-8 bar spans the full plot height (18)
    for (const r of rects) expect(r.height).toBe(18);
  });

  it('draws every bar from the zero baseline, including negatives', () => {
    const scene = bar([[-4, 6]], { mode: 'grouped' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(2);
    for (const r of rects) expect(r.height).toBeGreaterThan(0);
    // domain [-4,6] -> baseline y(0) = 11.8; negative bar hangs below it
    expect(rects[0]).toMatchObject({ y: 11.8, height: 7.2 });
    expect(rects[1]).toMatchObject({ y: 1, height: 10.8 });
  });

  it('lays out grouped bars along the category axis when horizontal', () => {
    const scene = bar([[3, 6]], { mode: 'grouped', horizontal: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(2);
    // side by side vertically: same height, different y
    expect(rects[0]!.height).toBe(rects[1]!.height);
    expect(rects[0]!.y).toBeLessThan(rects[1]!.y);
    // longer value -> longer bar along x
    expect(rects[1]!.width).toBeGreaterThan(rects[0]!.width);
  });

  it('keeps bar widths uniform and centers short columns with ragged data', () => {
    const scene = bar([[4, 8], [6]], { mode: 'grouped' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    const widths = new Set(rects.map((r) => r.width));
    expect(widths.size).toBe(1);
    // column 2's lone bar sits centered where its pair would be (56.86..76.46)
    const lone = rects[2]!.x as number;
    expect(lone).toBeGreaterThan(56.86);
    expect(lone).toBeLessThan(76.46);
  });

  it('colors each series consistently across columns', () => {
    const scene = bar([[1, 2], [3, 4]], { mode: 'grouped' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // same series index -> same palette color; different series -> different
    expect(rects[0]!.fill).toBe(rects[2]!.fill);
    expect(rects[0]!.fill).not.toBe(rects[1]!.fill);
    expect(rects[1]!.fill).toBe(rects[3]!.fill);
    for (const r of rects) expect(r.fillOpacity).toBe(1);
  });

  it('does not apply the stacked opacity step-down with a uniform color', () => {
    const scene = bar([[1, 2]], { mode: 'grouped', color: 'purple' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) {
      expect(r.fill).toBe('purple');
      expect(r.fillOpacity).toBe(1);
    }
  });

  it('draws one track per bar in grouped mode', () => {
    const scene = bar([[3, 6]], { mode: 'grouped', track: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    // 2 tracks + 2 bars
    expect(rects).toHaveLength(4);
    // tracks span the full value domain height (18)
    expect(rects[0]).toMatchObject({ height: 18 });
    expect(rects[1]).toMatchObject({ height: 18 });
  });

  it('defaults to stacked and matches an explicit stacked mode', () => {
    const data = [[3, 2], [5, 4]];
    const implicit = bar(data);
    const explicit = bar(data, { mode: 'stacked' });
    expect(explicit.marks).toEqual(implicit.marks);
    expect(explicit.points).toEqual(implicit.points);
  });

  it('exposes one point per segment with row/col', () => {
    const scene = bar([[3, 6], [9, 2]], { mode: 'grouped' });
    expect(scene.points).toHaveLength(4);
    expect(scene.points[0]).toMatchObject({ col: 0, row: 0, value: 3 });
    expect(scene.points[3]).toMatchObject({ col: 1, row: 1, value: 2 });
  });
});

describe('bar (waterfall)', () => {
  it("chains each column from the previous column's end value", () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    // domain [0,5] (cumulative levels) -> unit = 18/5 = 3.6; y(5)=1, y(0)=19
    expect(rects[0]).toMatchObject({ y: 8.2, height: 10.8 }); // 0 -> 3
    expect(rects[1]).toMatchObject({ y: 1, height: 7.2 }); // 3 -> 5
    expect(rects[2]).toMatchObject({ y: 1, height: 3.6 }); // 5 -> 4
    // chained: each bar starts where the previous one ended
    expect(rects[1]!.y + rects[1]!.height).toBeCloseTo(rects[0]!.y, 5);
    expect(rects[2]!.y).toBeCloseTo(rects[1]!.y, 5);
    // points report the deltas
    expect(scene.points.map((p) => p.value)).toEqual([3, 2, -1]);
  });

  it('scales the domain to cumulative levels, not deltas', () => {
    // deltas peak at 3 but the running total reaches 5: the 3 -> 5 bar
    // tops the plot, which a delta-scaled domain could not do
    const scene = bar([3, 2, -1], { mode: 'waterfall' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[1]).toMatchObject({ y: 1 });
  });

  it('colors steps by delta sign with upColor/downColor', () => {
    const scene = bar([3, -2, 1], {
      mode: 'waterfall',
      upColor: 'green',
      downColor: 'red',
    });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['green', 'red', 'green']);
  });

  it('falls back to the chart color when up/down colors are absent', () => {
    const scene = bar([3, -2], { mode: 'waterfall', color: 'blue' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect(r.fill).toBe('blue');
  });

  it('lets an explicit per-datum color win over up/down colors', () => {
    const scene = bar([{ value: 3, color: 'purple' }, -2], {
      mode: 'waterfall',
      upColor: 'green',
      downColor: 'red',
    });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['purple', 'red']);
  });

  it('appends a total column spanning 0 to the grand total when asked', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall', total: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    // grand total 4 -> 0 -> 4: y(4)=4.6, height 14.4
    expect(rects[3]).toMatchObject({ y: 4.6, height: 14.4 });
    expect(scene.points[3]).toMatchObject({ value: 4, label: 'Total', id: 'total' });
  });

  it('paints the total column with totalColor', () => {
    const scene = bar([3, 2], {
      mode: 'waterfall',
      total: true,
      totalColor: 'navy',
      upColor: 'green',
    });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['green', 'green', 'navy']);
  });

  it('does not append a total column by default', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall' });
    expect(scene.marks.filter((m) => m.type === 'rect')).toHaveLength(3);
  });

  it('draws dashed connectors between consecutive columns by default', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall' });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const p of paths) {
      expect(p.strokeDasharray).toBe('3 2');
      expect(p.fill).toBe('none');
      // level: both endpoints share one y
      const nums = p.d.match(/[\d.]+/g)!.map(Number);
      expect(nums[1]).toBeCloseTo(nums[3]!, 5);
    }
    // first connector sits at the 3-level: the top edge of the first bar,
    // spanning the gap to the second bar
    const nums = paths[0]!.d.match(/[\d.]+/g)!.map(Number);
    expect(nums[1]).toBeCloseTo(rects[0]!.y, 5);
    expect(nums[0]).toBeCloseTo(rects[0]!.x + rects[0]!.width, 5);
    expect(nums[2]).toBeCloseTo(rects[1]!.x, 5);
  });

  it('skips connectors when connectors: false', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall', connectors: false });
    expect(scene.marks.filter((m) => m.type === 'path')).toHaveLength(0);
  });

  it('connects the last delta column to the total column', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall', total: true });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(3);
    // the last connector meets the total bar's top at the grand-total level
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const nums = paths[2]!.d.match(/[\d.]+/g)!.map(Number);
    expect(nums[1]).toBeCloseTo(rects[3]!.y, 5);
  });

  it('chains bars along x when horizontal', () => {
    const scene = bar([3, 2, -1], { mode: 'waterfall', horizontal: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    // each bar starts where the previous one ended, along x
    expect(rects[1]!.x).toBeCloseTo(rects[0]!.x + rects[0]!.width, 5);
    expect(rects[2]!.x + rects[2]!.width).toBeCloseTo(rects[1]!.x + rects[1]!.width, 5);
    // connectors run vertically between the rows
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths).toHaveLength(2);
    const nums = paths[0]!.d.match(/[\d.]+/g)!.map(Number);
    expect(nums[0]).toBeCloseTo(nums[2]!, 5);
  });

  it('sums nested segments into one net step per column', () => {
    const scene = bar([[3, -1], [2]], { mode: 'waterfall' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(2);
    expect(scene.points.map((p) => p.value)).toEqual([2, 2]);
    // second bar starts where the first ended
    expect(rects[1]!.y + rects[1]!.height).toBeCloseTo(rects[0]!.y, 5);
  });

  it('steps downward from zero for all-negative deltas', () => {
    const scene = bar([-2, -3], { mode: 'waterfall', downColor: 'red' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(2);
    for (const r of rects) expect(r.fill).toBe('red');
    // second bar hangs below the first: its top is the first bar's bottom
    expect(rects[1]!.y).toBeCloseTo(rects[0]!.y + rects[0]!.height, 5);
  });

  it('handles zero deltas and empty data', () => {
    const scene = bar([3, 0, -1], { mode: 'waterfall' });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    expect(rects[1]!.height).toBe(0);
    expect(bar([], { mode: 'waterfall' }).marks).toHaveLength(0);
  });
});
