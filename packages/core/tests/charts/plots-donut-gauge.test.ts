import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { donut, type DonutOptions } from '../../src/charts/donut';
import { gauge, type GaugeOptions } from '../../src/charts/gauge';
import { toSVG } from '../../src/render/to-svg';
import type { DonutPlots, DonutPlotsSegment, GaugePlots, Plots } from '../../src/types';

// Segment angles and fractions are rounded to 3 decimals, so they are
// compared exactly; discrete fields exactly.
function expectSegmentCloseTo(actual: DonutPlotsSegment, expected: DonutPlotsSegment): void {
  expect(actual.value).toBe(expected.value);
  expect(actual.fraction).toBe(expected.fraction);
  expect(actual.startAngle).toBe(expected.startAngle);
  expect(actual.endAngle).toBe(expected.endAngle);
  expect(actual.index).toBe(expected.index);
  expect(actual.label).toBe(expected.label);
  expect(actual.color).toBe(expected.color);
}

describe('gauge plots (arc)', () => {
  it('returns the dial geometry with the classic 135°/270° defaults', () => {
    const { plots } = gauge({ value: 6, max: 10 }, { plots: true });
    expect(plots).toBeDefined();
    expect(plots).toEqual({
      kind: 'gauge',
      frame: { width: 20, height: 20, plot: { x: 0, y: 0, width: 20, height: 20 } },
      value: 6,
      min: 0,
      max: 10,
      frac: 0.6,
      startAngle: 135,
      endAngle: 405,
      zones: [],
      center: { x: 10, y: 10 },
      radius: 10,
    });
    // No needle angle in arc mode.
    expect('needleAngle' in plots!).toBe(false);
  });

  it('frames the dial bounding box on a non-square canvas', () => {
    const { plots } = gauge({ value: 5, max: 10 }, { width: 40, height: 20, plots: true });
    expect(plots!.frame).toEqual({
      width: 40,
      height: 20,
      plot: { x: 10, y: 0, width: 20, height: 20 },
    });
    expect(plots!.center).toEqual({ x: 20, y: 10 });
    expect(plots!.radius).toBe(10);
  });

  it('honors custom angles', () => {
    const { plots } = gauge(
      { value: 5, max: 10 },
      { startAngle: 0, endAngle: 180, plots: true },
    );
    expect(plots!.startAngle).toBe(0);
    expect(plots!.endAngle).toBe(180);
    expect(plots!.frac).toBe(0.5);
  });

  it('clamps the fraction but keeps the raw value', () => {
    expect(gauge({ value: 12, max: 10 }, { plots: true }).plots).toMatchObject({
      value: 12,
      frac: 1,
    });
    expect(gauge({ value: -3, max: 10 }, { plots: true }).plots).toMatchObject({
      value: -3,
      frac: 0,
    });
  });

  it('returns the needle angle in needle mode only', () => {
    const needle = gauge({ value: 6, max: 10 }, { mode: 'needle', plots: true }).plots!;
    expect(needle.needleAngle).toBe(297);
    const arc = gauge({ value: 6, max: 10 }, { mode: 'arc', plots: true }).plots!;
    expect('needleAngle' in arc).toBe(false);
  });
});

describe('gauge plots (zones)', () => {
  it('carries zone boundaries with the previous zone as the start', () => {
    const { plots } = gauge(
      { value: 6, max: 10 },
      {
        zones: [
          { to: 5, color: 'green' },
          { to: 8, color: 'yellow' },
          { to: 10, color: 'red' },
        ],
        plots: true,
      },
    );
    expect(plots!.zones).toEqual([
      { from: 0, to: 5, color: 'green' },
      { from: 5, to: 8, color: 'yellow' },
      { from: 8, to: 10, color: 'red' },
    ]);
  });

  it('clamps zones to the domain and drops empty ones', () => {
    const clamped = gauge(
      { value: 6, max: 10 },
      { zones: [{ to: 12, color: 'red' }], plots: true },
    ).plots!;
    expect(clamped.zones).toEqual([{ from: 0, to: 10, color: 'red' }]);
    const dropped = gauge(
      { value: 6, max: 10 },
      {
        zones: [
          { to: 5, color: 'a' },
          { to: 4, color: 'b' },
        ],
        plots: true,
      },
    ).plots!;
    expect(dropped.zones).toEqual([{ from: 0, to: 5, color: 'a' }]);
  });
});

describe('donut plots (segmented)', () => {
  it('returns one segment per datum with exact angles at gap 0', () => {
    const scene = donut([30, 70], { gap: 0, plots: true });
    const plots = scene.plots!;
    expect(plots.kind).toBe('donut');
    expect(plots.frame).toEqual({
      width: 20,
      height: 20,
      plot: { x: 0, y: 0, width: 20, height: 20 },
    });
    expect(plots.center).toEqual({ x: 10, y: 10 });
    expect(plots.innerRadius).toBe(6.5);
    expect(plots.outerRadius).toBe(10);
    expect(plots.segments).toHaveLength(2);
    const segPaths = scene.marks.filter((m) => m.type === 'path');
    expect(segPaths).toHaveLength(2);
    expectSegmentCloseTo(plots.segments[0]!, {
      value: 30,
      fraction: 0.3,
      startAngle: -90,
      endAngle: 18,
      index: 0,
      label: plots.segments[0]!.label,
      color: segPaths[0]!.stroke as string,
    });
    expectSegmentCloseTo(plots.segments[1]!, {
      value: 70,
      fraction: 0.7,
      startAngle: 18,
      endAngle: 270,
      index: 1,
      label: plots.segments[1]!.label,
      color: segPaths[1]!.stroke as string,
    });
  });

  it('insets segments by half the gap on both ends', () => {
    const { plots } = donut([30, 50, 20], { plots: true });
    // Default gap 0.2 at rMid 8.25: half-gap angle h = (0.1/8.25) * (180/pi)
    // = 0.694…; segment bounds are inset by h, then rounded to 3 decimals.
    const segs = plots!.segments;
    expect(segs).toHaveLength(3);
    expectSegmentCloseTo(segs[0]!, {
      value: 30,
      fraction: 0.3,
      startAngle: -89.306,
      endAngle: 17.306,
      index: 0,
      label: segs[0]!.label,
      color: segs[0]!.color,
    });
    expectSegmentCloseTo(segs[1]!, {
      value: 50,
      fraction: 0.5,
      startAngle: 18.694,
      endAngle: 197.306,
      index: 1,
      label: segs[1]!.label,
      color: segs[1]!.color,
    });
    expectSegmentCloseTo(segs[2]!, {
      value: 20,
      fraction: 0.2,
      startAngle: 198.694,
      endAngle: 269.306,
      index: 2,
      label: segs[2]!.label,
      color: segs[2]!.color,
    });
  });

  it('carries explicit labels and colors', () => {
    const { plots } = donut(
      [
        { value: 30, label: 'A', color: 'red' },
        { value: 70, label: 'B' },
      ],
      { gap: 0, plots: true },
    );
    expect(plots!.segments[0]!.label).toBe('A');
    expect(plots!.segments[0]!.color).toBe('red');
    expect(plots!.segments[1]!.label).toBe('B');
  });

  it('returns an empty payload for empty data and for a zero total', () => {
    const empty = donut([], { plots: true }).plots!;
    expect(empty).toEqual({
      kind: 'donut',
      frame: { width: 20, height: 20, plot: { x: 0, y: 0, width: 20, height: 20 } },
      segments: [],
      center: { x: 10, y: 10 },
      innerRadius: 6.5,
      outerRadius: 10,
    });
    expect(donut([0, 0], { plots: true }).plots!.segments).toEqual([]);
  });

  it('gives a negative segment a zero fraction and a collapsed arc', () => {
    const { plots } = donut([-5, 10], { gap: 0, plots: true });
    const segs = plots!.segments;
    expect(segs[0]!.value).toBe(-5);
    expect(segs[0]!.fraction).toBe(0);
    expect(segs[0]!.startAngle).toBe(segs[0]!.endAngle);
    expect(segs[1]!.fraction).toBe(1);
    expect(segs[1]!.startAngle).toBe(-90);
    expect(segs[1]!.endAngle).toBe(270);
  });

  it('honors a partial span', () => {
    const { plots } = donut([1, 1], { startAngle: 135, endAngle: 405, gap: 0, plots: true });
    expect(plots!.segments[0]!.startAngle).toBe(135);
    expect(plots!.segments[0]!.endAngle).toBe(270);
    expect(plots!.segments[1]!.startAngle).toBe(270);
    expect(plots!.segments[1]!.endAngle).toBe(405);
  });
});

describe('donut plots (gauge mode)', () => {
  it('delegates to gauge() and yields gauge plots', () => {
    const { plots } = donut({ value: 6, max: 10 }, { plots: true });
    expect(plots).toEqual({
      kind: 'gauge',
      frame: { width: 20, height: 20, plot: { x: 0, y: 0, width: 20, height: 20 } },
      value: 6,
      min: 0,
      max: 10,
      frac: 0.6,
      startAngle: -90,
      endAngle: 270,
      zones: [],
      center: { x: 10, y: 10 },
      radius: 10,
    });
    // The same dial through the standalone gauge chart: one shared path.
    const direct = gauge(
      { value: 6, max: 10 },
      { startAngle: -90, endAngle: 270, plots: true },
    ).plots!;
    expect(plots).toEqual(direct);
  });
});

describe('dial plots (differential + overlays)', () => {
  it('leaves the scenes byte-identical with the option off', () => {
    const donutWith = donut([30, 70], { plots: true });
    const donutWithout = donut([30, 70]);
    const { plots: _d, ...donutStripped } = donutWith;
    expect(_d).toBeDefined();
    expect(donutStripped).toEqual(donutWithout);
    expect(toSVG(donutWith)).toBe(toSVG(donutWithout));
    expect('plots' in donut([30, 70], { plots: false })).toBe(false);

    const gaugeWith = gauge({ value: 6, max: 10 }, { plots: true });
    const gaugeWithout = gauge({ value: 6, max: 10 });
    const { plots: _g, ...gaugeStripped } = gaugeWith;
    expect(_g).toBeDefined();
    expect(gaugeStripped).toEqual(gaugeWithout);
    expect(toSVG(gaugeWith)).toBe(toSVG(gaugeWithout));
    expect('plots' in gauge({ value: 6, max: 10 }, { plots: false })).toBe(false);
  });

  it('is identical with annotations on, and center labels stay out of plots', () => {
    const donutBase = donut([30, 70], { plots: true }).plots;
    expect(
      donut([30, 70], { plots: true, annotations: [{ x: 0, y: 50, shape: 'dot' }] }).plots,
    ).toEqual(donutBase);
    expect(donut([30, 70], { plots: true, centerLabel: 'Total' }).plots).toEqual(donutBase);

    const gaugeBase = gauge({ value: 6, max: 10 }, { plots: true }).plots;
    expect(
      gauge({ value: 6, max: 10 }, { plots: true, annotations: [{ x: 0, y: 6, shape: 'dot' }] })
        .plots,
    ).toEqual(gaugeBase);
    expect(gauge({ value: 6, max: 10 }, { plots: true, centerLabel: '6/10' }).plots).toEqual(
      gaugeBase,
    );
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(donut([1, 2], { plots: true }).plots).toEqualTypeOf<DonutPlots>();
    expectTypeOf(donut({ value: 6, max: 10 }, { plots: true }).plots).toEqualTypeOf<GaugePlots>();
    expectTypeOf(gauge({ value: 6, max: 10 }, { plots: true }).plots).toEqualTypeOf<GaugePlots>();
    expectTypeOf(donut([1, 2]).plots).toEqualTypeOf<Plots | undefined>();
    expectTypeOf(gauge({ value: 6, max: 10 }).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const donutOpts: DonutOptions = { plots: true };
    expectTypeOf(donut([1, 2], donutOpts).plots).toEqualTypeOf<Plots | undefined>();
    const gaugeOpts: GaugeOptions = { plots: true };
    expectTypeOf(gauge({ value: 6, max: 10 }, gaugeOpts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
