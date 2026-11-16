import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { bullet, type BulletOptions } from '../../src/charts/bullet';
import { toSVG } from '../../src/render/to-svg';
import type { BulletPlots, BulletPlotsRange, Plots } from '../../src/types';

// Geometry is full-precision floats: the same real number spelled through
// a different operation order can differ in the last ULP, so fractional
// fields are compared with toBeCloseTo and discrete fields exactly.
function expectRangeCloseTo(
  actual: BulletPlotsRange,
  expected: BulletPlotsRange,
): void {
  expect(actual.from).toBe(expected.from);
  expect(actual.to).toBe(expected.to);
  expect(actual.x).toBeCloseTo(expected.x, 12);
  expect(actual.width).toBeCloseTo(expected.width, 12);
  expect(actual.color).toBe(expected.color);
}

// Bullet at the default 100x20: padding 1, so the plot box is
// {x: 1, y: 1, width: 98, height: 18} and x(v) = 1 + 9.8v at max 10.
describe('bullet plots', () => {
  it('returns ranges, the value bar, and the target marker', () => {
    const { plots } = bullet(
      { value: 6, target: 8, ranges: [4, 7, 10], max: 10 },
      { plots: true },
    );
    expect(plots).toBeDefined();
    expect(plots!.kind).toBe('bullet');
    expect(plots!.max).toBe(10);
    expect(plots!.frame).toEqual({
      width: 100,
      height: 20,
      plot: { x: 1, y: 1, width: 98, height: 18 },
      xDomain: [0, 10],
    });
    expect(plots!.ranges).toHaveLength(3);
    expectRangeCloseTo(plots!.ranges[0]!, { from: 0, to: 4, x: 1, width: 39.2, color: 'currentColor' });
    expectRangeCloseTo(plots!.ranges[1]!, { from: 0, to: 7, x: 1, width: 68.6, color: 'currentColor' });
    expectRangeCloseTo(plots!.ranges[2]!, { from: 0, to: 10, x: 1, width: 98, color: 'currentColor' });
    expect(plots!.value.value).toBe(6);
    expect(plots!.value.x).toBeCloseTo(1, 12);
    expect(plots!.value.width).toBeCloseTo(58.8, 12);
    expect(plots!.value.color).toBe('currentColor');
    expect(plots!.target.value).toBe(8);
    expect(plots!.target.x).toBeCloseTo(79.4, 12);
    expect(plots!.target.color).toBe('currentColor');
  });

  it('sorts ranges ascending', () => {
    const { plots } = bullet(
      { value: 6, target: 8, ranges: [10, 4, 7], max: 10 },
      { plots: true },
    );
    expect(plots!.ranges.map((r) => r.to)).toEqual([4, 7, 10]);
  });

  it('infers max from the data when none is given', () => {
    const { plots } = bullet({ value: 6, target: 8, ranges: [4, 7] }, { plots: true });
    expect(plots!.max).toBe(8);
    expect(plots!.frame.xDomain).toEqual([0, 8]);
    // x(v) = 1 + 98v/8 at max 8.
    expect(plots!.value).toEqual({ value: 6, x: 1, width: 73.5, color: 'currentColor' });
    expect(plots!.target).toEqual({ value: 8, x: 99, color: 'currentColor' });
    expect(plots!.ranges.map((r) => r.width)).toEqual([49, 85.75]);
  });

  it('clamps negative inputs to 0 exactly as the marks are', () => {
    const scene = bullet(
      { value: -3, target: 12, ranges: [-2, 5], max: 10 },
      { plots: true },
    );
    const plots = scene.plots!;
    expect(plots.max).toBe(10);
    expect(plots.ranges).toEqual([
      { from: 0, to: 0, x: 1, width: 0, color: 'currentColor' },
      { from: 0, to: 5, x: 1, width: 49, color: 'currentColor' },
    ]);
    expect(plots.value).toEqual({ value: 0, x: 1, width: 0, color: 'currentColor' });
    expect(plots.target).toEqual({ value: 10, x: 99, color: 'currentColor' });
    // Plots and SVG never disagree: the rendered rects round to the plots.
    // Bands draw widest-first, so rect order is [to=5, to=0, value bar].
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(3);
    expect(rects[0]!.width).toBe(49);
    expect(rects[1]!.width).toBe(0);
    expect(rects[2]!.width).toBe(0);
    const target = scene.marks.find((m) => m.type === 'line')!;
    expect(target.x1).toBe(99);
  });

  it('keeps full float precision where the scene rounds', () => {
    const scene = bullet({ value: 1, target: 1, max: 3 }, { plots: true });
    // x(1) = 1 + 98/3; the scene rounds to 33.67.
    expect(scene.plots!.target.x).toBeCloseTo(1 + 98 / 3, 12);
    expect(scene.points[0]!.x).toBe(33.67);
    expect(scene.plots!.value.width).toBeCloseTo(98 / 3, 12);
    const bars = scene.marks.filter((m) => m.type === 'rect');
    const bar = bars[bars.length - 1]!;
    expect(bar.width).toBe(32.67);
  });

  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = bullet({ value: 6, target: 8, ranges: [4, 7, 10], max: 10 }, { plots: true });
    const without = bullet({ value: 6, target: 8, ranges: [4, 7, 10], max: 10 });
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect('plots' in bullet({ value: 6, target: 8, max: 10 }, { plots: false })).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations on', () => {
    const base = bullet({ value: 6, target: 8, ranges: [4, 7, 10], max: 10 }, { plots: true })
      .plots;
    const withAnnotations = bullet(
      { value: 6, target: 8, ranges: [4, 7, 10], max: 10 },
      { plots: true, annotations: [{ x: 5, y: 0, shape: 'dot' }] },
    ).plots;
    expect(withAnnotations).toEqual(base);
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(
      bullet({ value: 6, target: 8, max: 10 }, { plots: true }).plots,
    ).toEqualTypeOf<BulletPlots>();
    expectTypeOf(bullet({ value: 6, target: 8, max: 10 }).plots).toEqualTypeOf<
      Plots | undefined
    >();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: BulletOptions = { plots: true };
    expectTypeOf(bullet({ value: 6, target: 8, max: 10 }, opts).plots).toEqualTypeOf<
      Plots | undefined
    >();
  });
});
