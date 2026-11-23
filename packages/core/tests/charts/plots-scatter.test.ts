import { describe, it, expect, expectTypeOf } from 'vitest';
import { scatter, type ScatterOptions } from '../../src/charts/scatter';
import { toSVG } from '../../src/render/to-svg';
import { round } from '../../src/core/geometry';
import type { Plots, ScatterPlots } from '../../src/types';

const opts = { width: 100, height: 20, plots: true as const };

describe('scatter plots', () => {
  it('returns the golden fixture for [x,y] pairs', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 10],
        [5, 5],
      ],
      opts,
    );
    expect(scene.plots).toEqual({
      kind: 'scatter',
      frame: {
        width: 100,
        height: 20,
        plot: { x: 1, y: 1, width: 98, height: 18 },
        xDomain: [0, 10],
        yDomain: [0, 10],
      },
      series: [
        {
          seriesIndex: 0,
          points: [
            { x: 1, y: 19, valueX: 0, valueY: 0, index: 0, seriesIndex: 0, color: 'currentColor' },
            { x: 99, y: 1, valueX: 10, valueY: 10, index: 1, seriesIndex: 0, color: 'currentColor' },
            { x: 50, y: 10, valueX: 5, valueY: 5, index: 2, seriesIndex: 0, color: 'currentColor' },
          ],
        },
      ],
    });
  });

  it('rounds geometry to 3 decimals where the scene rounds to 2', () => {
    const scene = scatter(
      [
        [0, 0],
        [7, 7],
        [3, 3],
      ],
      opts,
    );
    const plots = scene.plots as ScatterPlots;
    const p = plots.series[0]!.points[2]!;
    expect(p.x).toBe(43);
    // y(3) = 19 - 3*18/7 = 11.285…; plots round to 3 decimals, the scene to 2.
    expect(p.y).toBe(11.286);
    expect(scene.points[2]).toMatchObject({ x: 43, y: 11.29 });
  });

  it('carries the resolved per-point color', () => {
    const scene = scatter(
      [
        { x: 0, y: 0, color: 'red' },
        { x: 10, y: 10 },
      ],
      { ...opts, color: 'purple' },
    );
    const plots = scene.plots as ScatterPlots;
    expect(plots.series[0]!.points[0]!.color).toBe('red');
    expect(plots.series[0]!.points[1]!.color).toBe('purple');
  });

  it('carries the accessor-resolved color', () => {
    type Row = { a: number; b: number };
    const scene = scatter(
      [
        { a: 0, b: 0 },
        { a: 10, b: 10 },
      ],
      {
        ...opts,
        x: (r: Row) => r.a,
        y: (r: Row) => r.b,
        colorAccessor: (r: Row) => (r.a > 0 ? 'green' : undefined),
      },
    );
    const plots = scene.plots as ScatterPlots;
    expect(plots.series[0]!.points[0]!.color).toBe('currentColor');
    expect(plots.series[0]!.points[1]!.color).toBe('green');
  });

  it('returns empty plots for empty data', () => {
    const scene = scatter([], opts);
    expect(scene.plots).toEqual({
      kind: 'scatter',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      series: [{ seriesIndex: 0, points: [] }],
    });
    expect(scene.marks).toEqual([]);
  });

  it('is a single series: scatter has no multi-series input', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 10],
      ],
      opts,
    );
    const plots = scene.plots as ScatterPlots;
    expect(plots.series).toHaveLength(1);
    expect(plots.series[0]!.seriesIndex).toBe(0);
    expect(plots.series[0]!.label).toBeUndefined();
  });

  it('leaves the scene byte-identical with the option off', () => {
    const data: [number, number][] = [
      [0, 0],
      [10, 10],
      [5, 5],
    ];
    const withPlots = scatter(data, opts);
    const { plots, ...rest } = withPlots;
    expect(rest).toEqual(scatter(data, { width: 100, height: 20 }));
    expect(scatter(data, { width: 100, height: 20, plots: false }).plots).toBeUndefined();
    expect(toSVG(withPlots)).toBe(toSVG(scatter(data, { width: 100, height: 20 })));
    expect(plots).toBeDefined();
  });

  it('is identical with overlays on and off', () => {
    const data: [number, number][] = [
      [0, 0],
      [10, 10],
      [5, 5],
    ];
    const base = scatter(data, opts).plots;
    const withAnnotations = scatter(data, {
      ...opts,
      annotations: [{ x: 5, y: 5, shape: 'dot' }],
    }).plots;
    const withReferenceLines = scatter(data, {
      ...opts,
      referenceLines: [
        { value: 5, orientation: 'horizontal' },
        { value: 5, orientation: 'vertical' },
      ],
    }).plots;
    const withHighlights = scatter(data, {
      ...opts,
      highlights: [{ x: [2, 4], color: 'red' }],
    }).plots;
    expect(withAnnotations).toEqual(base);
    expect(withReferenceLines).toEqual(base);
    expect(withHighlights).toEqual(base);
  });

  it('stays consistent with the rendered scene when axes are shown', () => {
    const data: [number, number][] = [
      [0, 0],
      [10, 10],
      [5, 5],
    ];
    const axesScene = scatter(data, {
      ...opts,
      xAxis: { show: true, ticks: true, labels: true },
      yAxis: { show: true, ticks: true, labels: true },
    });
    const plots = axesScene.plots as ScatterPlots;
    // Axes are layout, not overlays: the plot box moves, so the frame
    // differs from the no-axes case — but the points still track the marks.
    expect(plots.frame).not.toEqual(scatter(data, opts).plots?.frame);
    const rounded = plots.series[0]!.points.map((p) => ({ x: round(p.x), y: round(p.y) }));
    expect(rounded).toEqual(axesScene.points.map((p) => ({ x: p.x, y: p.y })));
  });

  it('resolves the overload types', () => {
    expectTypeOf(scatter([[0, 0]], { plots: true }).plots).toEqualTypeOf<ScatterPlots>();
    expectTypeOf(scatter([[0, 0]]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened options variable falls back to the plain Scene return.
    const widened: ScatterOptions = { plots: true };
    expectTypeOf(scatter([[0, 0]], widened).plots).toEqualTypeOf<Plots | undefined>();
  });
});
