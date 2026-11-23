import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { bar, type BarOptions } from '../../src/charts/bar';
import { toSVG } from '../../src/render/to-svg';
import type { BarPlots, BarPlotsBar, Plots } from '../../src/types';

// Geometry is rounded to 3 decimals: fractional fields are exact 3dp
// literals, compared with toBe; discrete fields exactly.
function expectBarCloseTo(actual: BarPlotsBar, expected: BarPlotsBar): void {
  expect(actual.x).toBe(expected.x);
  expect(actual.y).toBe(expected.y);
  expect(actual.width).toBe(expected.width);
  expect(actual.height).toBe(expected.height);
  expect(actual.value).toBe(expected.value);
  expect(actual.from).toBe(expected.from);
  expect(actual.index).toBe(expected.index);
  expect(actual.seriesIndex).toBe(expected.seriesIndex);
  expect(actual.color).toBe(expected.color);
}

// bar() at the default 100x20, no axes: the auto-padding shrinks to 0
// (bare bars need no clearance), so the plot box is the full 100x20.
describe('bar plots (simple)', () => {
  it('returns one bar per column with geometry rounded to 3 decimals', () => {
    const { plots } = bar([4, 9, 2, 7], { plots: true });
    expect(plots).toBeDefined();
    expect(plots!.kind).toBe('bar');
    expect(plots!.frame).toEqual({
      width: 100,
      height: 20,
      plot: { x: 0, y: 0, width: 100, height: 20 },
      xDomain: [0, 3],
      yDomain: [0, 9],
    });
    // slot = 100/4 = 25, gap 0.2 -> barW = 20, x0 = 2.5; domain [0,9].
    const bars = plots!.bars;
    expect(bars).toHaveLength(4);
    expectBarCloseTo(bars[0]!, {
      x: 2.5,
      y: 11.111,
      width: 20,
      height: 8.889,
      value: 4,
      index: 0,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expectBarCloseTo(bars[1]!, {
      x: 27.5,
      y: 0,
      width: 20,
      height: 20,
      value: 9,
      index: 1,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expectBarCloseTo(bars[2]!, {
      x: 52.5,
      y: 15.556,
      width: 20,
      height: 4.444,
      value: 2,
      index: 2,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expectBarCloseTo(bars[3]!, {
      x: 77.5,
      y: 4.444,
      width: 20,
      height: 15.556,
      value: 7,
      index: 3,
      seriesIndex: 0,
      color: 'currentColor',
    });
    // No `from` outside waterfall mode.
    for (const b of bars) expect('from' in b).toBe(false);
  });

  it('rounds geometry to 3 decimals where the scene rounds to 2', () => {
    const scene = bar([3, 7], { plots: true });
    // y(3) = 20 - 3*20/7 = 80/7 = 11.428…; plots round to 3 decimals, the scene to 2.
    expect(scene.plots!.bars[0]!.y).toBe(11.429);
    expect(scene.points[0]!.y).toBe(11.43);
    expect(scene.plots!.bars[0]!.height).toBe(8.571);
    expect(scene.points[0]!.h).toBe(8.57);
  });

  it('returns an empty payload for empty data', () => {
    const { plots } = bar([], { plots: true });
    expect(plots).toEqual({
      kind: 'bar',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      bars: [],
    });
  });
});

describe('bar plots (stacked)', () => {
  it('returns one entry per segment with its stacked position', () => {
    const scene = bar(
      [
        [3, 2],
        [5, 4],
      ],
      { plots: true },
    );
    const bars = scene.plots!.bars;
    expect(bars).toHaveLength(4);
    // Totals 5 and 9 -> domain [0,9]; slots: slot 50, barW 40, x0 5, x1 55.
    expectBarCloseTo(bars[0]!, {
      x: 5,
      y: 13.333,
      width: 40,
      height: 6.667,
      value: 3,
      index: 0,
      seriesIndex: 0,
      color: bars[0]!.color,
    });
    expectBarCloseTo(bars[1]!, {
      x: 5,
      y: 8.889,
      width: 40,
      height: 4.444,
      value: 2,
      index: 0,
      seriesIndex: 1,
      color: bars[1]!.color,
    });
    expectBarCloseTo(bars[2]!, {
      x: 55,
      y: 8.889,
      width: 40,
      height: 11.111,
      value: 5,
      index: 1,
      seriesIndex: 0,
      color: bars[2]!.color,
    });
    expectBarCloseTo(bars[3]!, {
      x: 55,
      y: 0,
      width: 40,
      height: 8.889,
      value: 4,
      index: 1,
      seriesIndex: 1,
      color: bars[3]!.color,
    });
    // Plots colors are the colors the rects render with (palette here).
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    for (let i = 0; i < 4; i++) expect(bars[i]!.color).toBe(rects[i]!.fill);
  });

  it('carries an explicit per-segment color', () => {
    const scene = bar([[{ value: 3, color: 'red' }, 2]], { plots: true });
    expect(scene.plots!.bars[0]!.color).toBe('red');
    expect(scene.plots!.bars[1]!.color).toBe(
      scene.marks.filter((m) => m.type === 'rect')[1]!.fill,
    );
  });
});

describe('bar plots (grouped)', () => {
  it('returns one entry per sub-bar', () => {
    const scene = bar(
      [
        [3, 2],
        [5, 4],
      ],
      { mode: 'grouped', plots: true },
    );
    const bars = scene.plots!.bars;
    expect(bars).toHaveLength(4);
    // Domain spans individual values [0,5]; sub-slots: barW 16, offsets 2/22.
    expect(bars[0]).toEqual({
      x: 7,
      y: 8,
      width: 16,
      height: 12,
      value: 3,
      index: 0,
      seriesIndex: 0,
      color: bars[0]!.color,
    });
    expect(bars[1]).toEqual({
      x: 27,
      y: 12,
      width: 16,
      height: 8,
      value: 2,
      index: 0,
      seriesIndex: 1,
      color: bars[1]!.color,
    });
    expect(bars[2]).toEqual({
      x: 57,
      y: 0,
      width: 16,
      height: 20,
      value: 5,
      index: 1,
      seriesIndex: 0,
      color: bars[2]!.color,
    });
    expect(bars[3]).toEqual({
      x: 77,
      y: 4,
      width: 16,
      height: 16,
      value: 4,
      index: 1,
      seriesIndex: 1,
      color: bars[3]!.color,
    });
    expect(scene.plots!.frame.xDomain).toEqual([0, 1]);
    expect(scene.plots!.frame.yDomain).toEqual([0, 5]);
  });
});

describe('bar plots (waterfall)', () => {
  it('carries the start value on every floating bar', () => {
    const scene = bar([3, -1, 2], { mode: 'waterfall', connectors: false, plots: true });
    const bars = scene.plots!.bars;
    expect(bars).toHaveLength(3);
    // Bases [0, 3, 2]; domain [0,4]; slots: slot 100/3, barW 80/3, x0 10/3.
    expectBarCloseTo(bars[0]!, {
      x: 3.333,
      y: 5,
      width: 26.667,
      height: 15,
      value: 3,
      from: 0,
      index: 0,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expectBarCloseTo(bars[1]!, {
      x: 36.667,
      y: 5,
      width: 26.667,
      height: 5,
      value: -1,
      from: 3,
      index: 1,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expectBarCloseTo(bars[2]!, {
      x: 70,
      y: 0,
      width: 26.667,
      height: 10,
      value: 2,
      from: 2,
      index: 2,
      seriesIndex: 0,
      color: 'currentColor',
    });
  });

  it('includes the total column starting at 0', () => {
    const scene = bar([3, -1, 2], { mode: 'waterfall', total: true, connectors: false, plots: true });
    const bars = scene.plots!.bars;
    expect(bars).toHaveLength(4);
    expect(bars[3]).toEqual({
      x: 77.5,
      y: 0,
      width: 20,
      height: 20,
      value: 4,
      from: 0,
      index: 3,
      seriesIndex: 0,
      color: 'currentColor',
    });
  });

  it('stays consistent with the scene when connectors claim padding', () => {
    // Connectors on (the default) claim 0.5px of padding, so the plot box
    // shrinks; plots must still round to the rendered rects.
    const scene = bar([3, -1, 2], { mode: 'waterfall', plots: true });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const b = scene.plots!.bars[i]!;
      const r = rects[i]!;
      expect(Math.round(b.x * 100) / 100).toBe(r.x);
      expect(Math.round(b.y * 100) / 100).toBe(r.y);
      expect(Math.round(b.width * 100) / 100).toBe(r.width);
      expect(Math.round(b.height * 100) / 100).toBe(r.height);
    }
  });
});

describe('bar plots (horizontal)', () => {
  it('keeps the same shape with axes swapped', () => {
    const scene = bar([4, 9], { horizontal: true, plots: true });
    const bars = scene.plots!.bars;
    expect(bars).toHaveLength(2);
    // Value scale runs along x: x(v) = 100v/9; slots run down y: barW 8.
    expect(bars[0]).toEqual({
      x: 0,
      y: 1,
      width: 44.444,
      height: 8,
      value: 4,
      index: 0,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expect(bars[1]).toEqual({
      x: 0,
      y: 11,
      width: 100,
      height: 8,
      value: 9,
      index: 1,
      seriesIndex: 0,
      color: 'currentColor',
    });
    // The frame's domains follow the rendered axes.
    expect(scene.plots!.frame.xDomain).toEqual([0, 9]);
    expect(scene.plots!.frame.yDomain).toEqual([0, 1]);
  });

  it('reflects negative values as rendered', () => {
    const scene = bar([-4, 9], { horizontal: true, plots: true });
    const bars = scene.plots!.bars;
    // Domain [-4,9]; x(0) = 400/13, so the negative bar spans 0..x(0).
    expect(bars[0]).toEqual({
      x: 0,
      y: 1,
      width: 30.769,
      height: 8,
      value: -4,
      index: 0,
      seriesIndex: 0,
      color: 'currentColor',
    });
    expect(bars[1]).toEqual({
      x: 30.769,
      y: 11,
      width: 69.231,
      height: 8,
      value: 9,
      index: 1,
      seriesIndex: 0,
      color: 'currentColor',
    });
  });
});

describe('bar plots (differential + overlays)', () => {
  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = bar([4, 9, 2, 7], { plots: true });
    const without = bar([4, 9, 2, 7]);
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect('plots' in bar([4, 9], { plots: false })).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations, reference lines, and highlights on', () => {
    const data: [number, number][] = [
      [3, 2],
      [5, 4],
    ];
    const base = bar(data, { plots: true }).plots;
    const withAnnotations = bar(data, {
      plots: true,
      annotations: [{ x: 0, y: 4, shape: 'dot' }],
    }).plots;
    expect(withAnnotations).toEqual(base);
    const withRefLines = bar(data, {
      plots: true,
      referenceLines: [{ value: 5, orientation: 'horizontal' }],
    }).plots;
    expect(withRefLines).toEqual(base);
    const withHighlights = bar(data, {
      plots: true,
      highlights: [{ x: [0, 1], y: [0, 5], color: 'rgba(0,0,0,0.1)' }],
    }).plots;
    expect(withHighlights).toEqual(base);
    const withTrack = bar(data, { plots: true, track: true }).plots;
    expect(withTrack).toEqual(base);
  });

  it('stays consistent with the rendered scene when axes are shown', () => {
    // Axes are layout, not overlays: they move the plot box, so plots
    // legitimately differ from the no-axes case. The invariant is that
    // plots round to the rendered scene points.
    const scene = bar([4, 9, 2, 7], {
      plots: true,
      xAxis: { show: true, ticks: true, labels: true },
      yAxis: { show: true, ticks: true, labels: true },
    });
    const noAxes = bar([4, 9, 2, 7], { plots: true });
    expect(scene.plots!.frame.plot).not.toEqual(noAxes.plots!.frame.plot);
    for (let i = 0; i < 4; i++) {
      const b = scene.plots!.bars[i]!;
      const p = scene.points[i]!;
      expect(Math.round(b.x * 100) / 100).toBe(p.x);
      expect(Math.round(b.y * 100) / 100).toBe(p.y);
      expect(Math.round(b.width * 100) / 100).toBe(p.w);
      expect(Math.round(b.height * 100) / 100).toBe(p.h);
    }
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(bar([1, 2], { plots: true }).plots).toEqualTypeOf<BarPlots>();
    expectTypeOf(bar([1, 2]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: BarOptions = { plots: true };
    expectTypeOf(bar([1, 2], opts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
