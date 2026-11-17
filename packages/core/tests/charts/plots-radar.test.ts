import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { radar, type RadarOptions } from '../../src/charts/radar';
import { toSVG } from '../../src/render/to-svg';
import type { Plots, RadarPlots } from '../../src/types';

// Radar at the default 100x100: padding 1, so center (50, 50), radius 49,
// start angle -90° (axis 0 straight up), angles clockwise.
describe('radar plots', () => {
  it('returns one vertex per axis with the polar geometry', () => {
    const scene = radar([3, 6, 9], { plots: true });
    const plots = scene.plots!;
    expect(plots).toBeDefined();
    expect(plots.kind).toBe('radar');
    expect(plots.center).toEqual({ x: 50, y: 50 });
    expect(plots.radius).toBe(49);
    expect(plots.frame).toEqual({
      width: 100,
      height: 100,
      plot: { x: 1, y: 1, width: 98, height: 98 },
      xDomain: [0, 2],
      yDomain: [0, 9],
    });
    expect(plots.series).toHaveLength(1);
    expect(plots.series[0]!.seriesIndex).toBe(0);
    expect(plots.series[0]!.label).toBeUndefined();
    const vs = plots.series[0]!.vertices;
    expect(vs).toHaveLength(3);
    // Axis 0 (value 3): straight up, r = 49*3/9.
    expect(vs[0]!.axis).toBe(0);
    expect(vs[0]!.value).toBe(3);
    expect(vs[0]!.x).toBe(50);
    expect(vs[0]!.y).toBe(33.667);
    // Axis 1 (value 6): 30°, r = 49*6/9.
    expect(vs[1]!.x).toBe(78.29);
    expect(vs[1]!.y).toBe(66.333);
    // Axis 2 (value 9): 150°, r = 49 (the rim).
    expect(vs[2]!.x).toBe(7.565);
    expect(vs[2]!.y).toBe(74.5);
    // The vertex color is the polygon's stroke color.
    const line = scene.marks.find((m) => m.type === 'polyline')!;
    for (const v of vs) expect(v.color).toBe(line.stroke);
  });

  it('groups vertices per series with labels, padding shorter series with center vertices', () => {
    const { plots } = radar(
      [
        { data: [3, 6, 9], name: 'A' },
        { data: [9, 3], name: 'B', color: 'red' },
      ],
      { plots: true },
    );
    expect(plots!.series).toHaveLength(2);
    expect(plots!.series[0]!.label).toBe('A');
    expect(plots!.series[1]!.label).toBe('B');
    expect(plots!.series[0]!.vertices).toHaveLength(3);
    expect(plots!.series[1]!.vertices).toHaveLength(3);
    expect(plots!.series[1]!.vertices[0]!.value).toBe(9);
    expect(plots!.series[1]!.vertices[1]!.value).toBe(3);
    // The missing third datum is value 0 at the center.
    const missing = plots!.series[1]!.vertices[2]!;
    expect(missing.value).toBe(0);
    expect(missing.x).toBe(50);
    expect(missing.y).toBe(50);
    expect(plots!.series[1]!.vertices.every((v) => v.color === 'red')).toBe(true);
    expect(plots!.series[0]!.vertices[0]!.seriesIndex).toBe(0);
    expect(plots!.series[1]!.vertices[0]!.seriesIndex).toBe(1);
  });

  it('clamps values into [0, domainMax] for geometry but keeps raw values', () => {
    const { plots } = radar([12, -2, 5], { max: 10, plots: true });
    expect(plots!.frame.yDomain).toEqual([0, 10]);
    const vs = plots!.series[0]!.vertices;
    // 12 clamps to the rim (straight up, r = 49).
    expect(vs[0]!.value).toBe(12);
    expect(vs[0]!.x).toBe(50);
    expect(vs[0]!.y).toBe(1);
    // -2 clamps to the center.
    expect(vs[1]!.value).toBe(-2);
    expect(vs[1]!.x).toBe(50);
    expect(vs[1]!.y).toBe(50);
    // 5 sits at half radius on the 150° axis.
    expect(vs[2]!.value).toBe(5);
    expect(vs[2]!.x).toBe(28.782);
    expect(vs[2]!.y).toBe(62.25);
  });

  it('returns one vertex for a single axis', () => {
    const { plots } = radar([5], { plots: true });
    expect(plots!.series[0]!.vertices).toHaveLength(1);
    expect(plots!.series[0]!.vertices[0]!.x).toBeCloseTo(50, 12);
    expect(plots!.series[0]!.vertices[0]!.y).toBeCloseTo(1, 12);
  });

  it('returns an empty payload for empty data', () => {
    const { plots } = radar([], { plots: true });
    expect(plots).toEqual({
      kind: 'radar',
      frame: { width: 100, height: 100, plot: { x: 1, y: 1, width: 98, height: 98 } },
      series: [],
      center: { x: 50, y: 50 },
      radius: 49,
    });
  });

  it('rounds geometry to 3 decimals where the scene rounds to 2', () => {
    const scene = radar([3, 6, 9], { plots: true });
    // Axis 0: y = 50 - 49/3 = 33.666…; plots round to 3 decimals, the scene to 2.
    expect(scene.plots!.series[0]!.vertices[0]!.y).toBe(33.667);
    expect(scene.points[0]!.y).toBe(33.67);
  });

  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = radar([3, 6, 9], { plots: true });
    const without = radar([3, 6, 9]);
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect('plots' in radar([3, 6, 9], { plots: false })).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations on and with the grid off', () => {
    const base = radar([3, 6, 9], { plots: true }).plots;
    expect(
      radar([3, 6, 9], { plots: true, annotations: [{ x: 0, y: 5, shape: 'dot' }] }).plots,
    ).toEqual(base);
    expect(radar([3, 6, 9], { plots: true, grid: false }).plots).toEqual(base);
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(radar([1, 2, 3], { plots: true }).plots).toEqualTypeOf<RadarPlots>();
    expectTypeOf(radar([1, 2, 3]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: RadarOptions = { plots: true };
    expectTypeOf(radar([1, 2, 3], opts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
