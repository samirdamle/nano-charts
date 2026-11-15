import { describe, it, expect, expectTypeOf } from 'vitest';
import { line, type LineOptions } from '../../src/charts/line';
import { area } from '../../src/charts/area';
import { lines } from '../../src/charts/lines';
import { toSVG } from '../../src/render/to-svg';
import { round } from '../../src/core/geometry';
import type { AreaPlots, LinePlots, LinesPlots, Plots } from '../../src/types';

describe('line plots (#219)', () => {
  it('returns per-series points at full precision', () => {
    const scene = line([0, 10, 5], { plots: true });
    expect(scene.plots).toEqual({
      kind: 'line',
      frame: {
        width: 100,
        height: 20,
        plot: { x: 0.5, y: 0.5, width: 99, height: 19 },
        xDomain: [0, 2],
        yDomain: [0, 10],
      },
      series: [
        {
          seriesIndex: 0,
          points: [
            { x: 0.5, y: 19.5, value: 0, index: 0, seriesIndex: 0, color: 'currentColor' },
            { x: 50, y: 0.5, value: 10, index: 1, seriesIndex: 0, color: 'currentColor' },
            { x: 99.5, y: 10, value: 5, index: 2, seriesIndex: 0, color: 'currentColor' },
          ],
        },
      ],
    });
  });

  it('keeps full float precision where scene points are rounded', () => {
    const scene = line([0, 7, 3], { plots: true });
    const plotsPoint = scene.plots!.series[0]!.points[2]!;
    expect(plotsPoint.y).toBe(19.5 - (3 * 19) / 7);
    expect(scene.points[2]!.y).toBe(11.36);
    expect(plotsPoint.y).not.toBe(scene.points[2]!.y);
  });

  it('carries data points in spline mode too (the curve is a rendering detail)', () => {
    const linear = line([0, 10, 5], { plots: true }).plots;
    const spline = line([0, 10, 5], { plots: true, mode: 'spline' }).plots;
    expect(spline).toEqual(linear);
  });

  it('carries the same datum identity regardless of the dot setting', () => {
    // Dots change the auto-padding, hence the pixel layout — so the pixels
    // legitimately differ. What must not change is the datum identity.
    const none = line([0, 10, 5], { plots: true }).plots!;
    const last = line([0, 10, 5], { plots: true, dot: 'last' }).plots!;
    const all = line([0, 10, 5], { plots: true, dot: 'all' }).plots!;
    const identity = (p: { value: number; index: number; seriesIndex?: number; color: string }) => ({
      value: p.value,
      index: p.index,
      seriesIndex: p.seriesIndex,
      color: p.color,
    });
    expect(last.series[0]!.points.map(identity)).toEqual(none.series[0]!.points.map(identity));
    expect(all.series[0]!.points.map(identity)).toEqual(none.series[0]!.points.map(identity));
    // And each plots payload still matches its own rendered scene.
    for (const scene of [
      line([0, 10, 5], { plots: true }),
      line([0, 10, 5], { plots: true, dot: 'last' }),
    ]) {
      expect(
        scene.plots!.series[0]!.points.map((p) => [round(p.x), round(p.y)]),
      ).toEqual(scene.points.map((p) => [p.x, p.y]));
    }
  });

  it('covers a single point', () => {
    const scene = line([7], { plots: true });
    expect(scene.plots!.series[0]!.points).toEqual([
      { x: 50, y: 10, value: 7, index: 0, seriesIndex: 0, color: 'currentColor' },
    ]);
  });

  it('returns plots with empty arrays for empty data', () => {
    expect(line([], { plots: true }).plots).toEqual({
      kind: 'line',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      series: [{ seriesIndex: 0, points: [] }],
    });
  });
});

describe('area plots (#219)', () => {
  it('adds the baseline the fill sits on', () => {
    const scene = area([0, 10, 5], { plots: true });
    expect(scene.plots).toEqual({
      kind: 'area',
      frame: {
        width: 100,
        height: 20,
        plot: { x: 0.5, y: 0.5, width: 99, height: 19 },
        xDomain: [0, 2],
        yDomain: [0, 10],
      },
      series: [
        {
          seriesIndex: 0,
          points: [
            { x: 0.5, y: 19.5, value: 0, index: 0, seriesIndex: 0, color: 'currentColor' },
            { x: 50, y: 0.5, value: 10, index: 1, seriesIndex: 0, color: 'currentColor' },
            { x: 99.5, y: 10, value: 5, index: 2, seriesIndex: 0, color: 'currentColor' },
          ],
        },
      ],
      baselineY: 19.5,
    });
  });

  it('returns plots with empty arrays and no baseline for empty data', () => {
    const plots = area([], { plots: true }).plots!;
    expect(plots).toEqual({
      kind: 'area',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      series: [{ seriesIndex: 0, points: [] }],
    });
    expect('baselineY' in plots).toBe(false);
  });
});

describe('lines plots (#219)', () => {
  it('groups points per series with label and resolved color', () => {
    const scene = lines(
      [
        { data: [0, 10], name: 'A', color: 'red' },
        { data: [5, 5], name: 'B' },
      ],
      { plots: true },
    );
    const plots = scene.plots!;
    expect(plots.kind).toBe('lines');
    expect(plots.frame).toEqual({
      width: 100,
      height: 20,
      plot: { x: 0.5, y: 0.5, width: 99, height: 19 },
      xDomain: [0, 1],
      yDomain: [0, 10],
    });
    expect(plots.series[0]).toEqual({
      seriesIndex: 0,
      label: 'A',
      points: [
        { x: 0.5, y: 19.5, value: 0, index: 0, seriesIndex: 0, color: 'red' },
        { x: 99.5, y: 0.5, value: 10, index: 1, seriesIndex: 0, color: 'red' },
      ],
    });
    expect(plots.series[1]!.label).toBe('B');
    expect(plots.series[1]!.points).toEqual([
      { x: 0.5, y: 10, value: 5, index: 0, seriesIndex: 1, color: plots.series[1]!.points[0]!.color },
      { x: 99.5, y: 10, value: 5, index: 1, seriesIndex: 1, color: plots.series[1]!.points[0]!.color },
    ]);
    // Each series' plots color is the color its polyline renders with.
    const polylines = scene.marks.filter((m) => m.type === 'polyline');
    expect(polylines).toHaveLength(2);
    expect(polylines[0]).toMatchObject({ stroke: 'red' });
    expect(polylines[1]).toMatchObject({ stroke: plots.series[1]!.points[0]!.color });
  });

  it('returns plots with empty arrays for empty data', () => {
    expect(lines([], { plots: true }).plots).toEqual({
      kind: 'lines',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      series: [],
    });
    expect(lines([{ data: [], name: 'Empty' }], { plots: true }).plots).toEqual({
      kind: 'lines',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      series: [{ seriesIndex: 0, label: 'Empty', points: [] }],
    });
  });
});

describe('line-family plots: differential (#219)', () => {
  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = line([0, 10, 5], { plots: true });
    const { plots, ...rest } = withPlots;
    expect(plots).toBeDefined();
    expect(rest).toEqual(line([0, 10, 5]));
    expect('plots' in line([0, 10, 5])).toBe(false);
    expect('plots' in line([0, 10, 5], { plots: false })).toBe(false);
  });

  it('does not change toSVG output', () => {
    expect(toSVG(line([0, 10, 5], { plots: true }))).toBe(toSVG(line([0, 10, 5])));
    expect(toSVG(area([0, 10, 5], { plots: true }))).toBe(toSVG(area([0, 10, 5])));
  });
});

describe('line-family plots: overlays (#219)', () => {
  it('plots are identical with annotations, reference lines, and highlights on', () => {
    const base = line([0, 10, 5], { plots: true }).plots;
    const withAnnotations = line([0, 10, 5], {
      plots: true,
      annotations: [{ x: 1, y: 5, shape: 'dot' }],
    }).plots;
    expect(withAnnotations).toEqual(base);
    const withRefLines = line([0, 10, 5], {
      plots: true,
      referenceLines: [{ value: 5, orientation: 'horizontal' }],
    }).plots;
    expect(withRefLines).toEqual(base);
    const withHighlights = line([0, 10, 5], {
      plots: true,
      highlights: [{ x: [0, 1], y: [0, 10], color: 'rgba(0,0,0,0.1)' }],
    }).plots;
    expect(withHighlights).toEqual(base);
  });

  it('plots stay consistent with the rendered scene when axes take space', () => {
    // Axes are layout, not overlays: they move the plot box, so plots differ
    // from the no-axes case — but they must still match the rendered scene.
    const scene = line([0, 10, 5], {
      plots: true,
      xAxis: { show: true, ticks: true, labels: true },
      yAxis: { show: true, ticks: true, labels: true },
    });
    expect(scene.plots!.frame.plot).not.toEqual({ x: 0.5, y: 0.5, width: 99, height: 19 });
    expect(
      scene.plots!.series[0]!.points.map((p) => [round(p.x), round(p.y)]),
    ).toEqual(scene.points.map((p) => [p.x, p.y]));
  });
});

describe('line-family plots: overloads (#219)', () => {
  it('resolves the plots overload', () => {
    expectTypeOf(line([1, 2], { plots: true }).plots).toEqualTypeOf<LinePlots>();
    expectTypeOf(area([1, 2], { plots: true }).plots).toEqualTypeOf<AreaPlots>();
    expectTypeOf(lines([{ data: [1, 2] }], { plots: true }).plots).toEqualTypeOf<LinesPlots>();
    expectTypeOf(line([1, 2]).plots).toEqualTypeOf<Plots | undefined>();
  });

  it('falls back to the plain Scene for a widened options variable', () => {
    const widened: LineOptions = { plots: true };
    expectTypeOf(line([1, 2], widened).plots).toEqualTypeOf<Plots | undefined>();
  });
});
