import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { winLoss, type WinLossOptions } from '../../src/charts/win-loss';
import { round } from '../../src/core/geometry';
import { toSVG } from '../../src/render/to-svg';
import type { Plots, WinLossPlots } from '../../src/types';

// winLoss defaults: 100x20 canvas, padding 1, gap 0.2.
// The plot box is {x: 1, y: 1, width: 98, height: 18}; slots are 24.5 wide,
// bars 19.6 wide at x = 3.45, 27.95, 52.45, 76.95; the centerline is y = 10
// and each half is 9 tall.
describe('winLoss plots', () => {
  it('returns one block per datum with its sign and rect', () => {
    const scene = winLoss([1, -1, 0, 2], { plots: true });
    const plots = scene.plots!;
    expect(plots).toBeDefined();
    expect(plots.kind).toBe('winLoss');
    expect(plots.frame).toEqual({
      width: 100,
      height: 20,
      plot: { x: 1, y: 1, width: 98, height: 18 },
      xDomain: [0, 3],
    });
    const expected = [
      { index: 0, value: 1, sign: 'up', x: 3.45, y: 1, width: 19.6, height: 9 },
      { index: 1, value: -1, sign: 'down', x: 27.95, y: 10, width: 19.6, height: 9 },
      { index: 2, value: 0, sign: 'flat', x: 52.45, y: 9.5, width: 19.6, height: 1 },
      { index: 3, value: 2, sign: 'up', x: 76.95, y: 1, width: 19.6, height: 9 },
    ] as const;
    expect(plots.blocks).toHaveLength(4);
    for (const [i, e] of expected.entries()) {
      const b = plots.blocks[i]!;
      expect(b.index).toBe(e.index);
      expect(b.value).toBe(e.value);
      expect(b.sign).toBe(e.sign);
      expect(b.x).toBeCloseTo(e.x, 12);
      expect(b.y).toBe(e.y);
      expect(b.width).toBeCloseTo(e.width, 12);
      expect(b.height).toBe(e.height);
      expect(b.color).toBe('currentColor');
    }
    // The plots rects are exactly the rendered rects, up to the scene's
    // 2dp rounding.
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects).toHaveLength(4);
    for (const [i, rect] of rects.entries()) {
      const b = plots.blocks[i]!;
      expect([rect.x, rect.y, rect.width, rect.height]).toEqual([
        round(b.x),
        round(b.y),
        round(b.width),
        round(b.height),
      ]);
    }
  });

  it('carries the win and loss colors', () => {
    const scene = winLoss([1, -1, 0], { winColor: 'green', lossColor: 'red', plots: true });
    expect(scene.plots!.blocks.map((b) => b.color)).toEqual(['green', 'red', 'green']);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map((r) => r.fill)).toEqual(['green', 'red', 'green']);
    // A flat block is dimmed by opacity, not by a different color.
    expect(rects[2]!.fillOpacity).toBe(0.4);
  });

  it('returns an empty payload for empty data', () => {
    const { plots } = winLoss([], { plots: true });
    expect(plots).toEqual({
      kind: 'winLoss',
      frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
      blocks: [],
    });
  });

  it('rounds geometry to 3 decimals where the scene rounds to 2', () => {
    const scene = winLoss([1, -1, 1], { gap: 1 / 3, plots: true });
    // Slot is 98/3; bar width is (98/3)*(2/3); the second bar's left edge
    // is 1 + 98/3 + (98/3 - 196/9)/2 = 39.111…; plots round to 3 decimals.
    expect(scene.plots!.blocks[1]!.x).toBe(39.111);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[1]!.x).toBe(39.11);
  });

  it('leaves the scene byte-identical with the option off', () => {
    const withPlots = winLoss([1, -1, 0, 2], { plots: true });
    const without = winLoss([1, -1, 0, 2]);
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect('plots' in winLoss([1, -1, 0, 2], { plots: false })).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations on', () => {
    const base = winLoss([1, -1, 0, 2], { plots: true }).plots;
    expect(
      winLoss([1, -1, 0, 2], {
        plots: true,
        annotations: [{ x: 1, shape: 'dot' }],
      }).plots,
    ).toEqual(base);
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(winLoss([1, -1], { plots: true }).plots).toEqualTypeOf<WinLossPlots>();
    expectTypeOf(winLoss([1, -1]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: WinLossOptions = { plots: true };
    expectTypeOf(winLoss([1, -1], opts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
