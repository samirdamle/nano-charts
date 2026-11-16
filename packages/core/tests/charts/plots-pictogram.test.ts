import { describe, it, expect } from 'vitest';
import { expectTypeOf } from 'vitest';
import { pictogram, type PictogramOptions } from '../../src/charts/pictogram';
import { toSVG } from '../../src/render/to-svg';
import type { PictogramPlots, Plots } from '../../src/types';

// Pictogram defaults: blockSize 8, gap 0.25 (2px), pitch 10, padding 0.
// Vertical: columns left-to-right, blocks stack bottom-up.
// [2, 3] is an 18x28 scene; blocks sit at x = series*10, y = (3-1-k)*10.
describe('pictogram plots', () => {
  it('returns one block per slot with the grid geometry (vertical)', () => {
    const scene = pictogram([2, 3], { plots: true });
    const plots = scene.plots!;
    expect(plots).toBeDefined();
    expect(plots.kind).toBe('pictogram');
    expect(plots.frame).toEqual({
      width: 18,
      height: 28,
      plot: { x: 0, y: 0, width: 18, height: 28 },
      xDomain: [0, 1],
      yDomain: [0, 2],
    });
    expect('connectors' in plots).toBe(false);
    expect(plots.blocks).toHaveLength(5);
    const uses = scene.marks.filter((m) => m.type === 'use');
    expect(uses).toHaveLength(5);
    const expected = [
      { series: 0, blockNumber: 1, x: 0, y: 20 },
      { series: 0, blockNumber: 2, x: 0, y: 10 },
      { series: 1, blockNumber: 1, x: 10, y: 20 },
      { series: 1, blockNumber: 2, x: 10, y: 10 },
      { series: 1, blockNumber: 3, x: 10, y: 0 },
    ];
    for (const [i, e] of expected.entries()) {
      const b = plots.blocks[i]!;
      expect(b.series).toBe(e.series);
      expect(b.blockNumber).toBe(e.blockNumber);
      expect(b.x).toBe(e.x);
      expect(b.y).toBe(e.y);
      expect(b.size).toBe(8);
      expect(b.filled).toBe(true);
      expect(b.empty).toBe(false);
      expect(b.partial).toBe(false);
      // The block's resolved color is its rendered fill.
      expect(b.color).toBe(uses[i]!.fill);
    }
  });

  it('returns the transposed grid in horizontal mode', () => {
    const { plots } = pictogram([2, 3], { horizontal: true, plots: true });
    expect(plots!.frame).toEqual({
      width: 28,
      height: 18,
      plot: { x: 0, y: 0, width: 28, height: 18 },
      xDomain: [0, 2],
      yDomain: [0, 1],
    });
    expect(plots!.blocks.map((b) => [b.series, b.blockNumber, b.x, b.y])).toEqual([
      [0, 1, 0, 0],
      [0, 2, 10, 0],
      [1, 1, 0, 10],
      [1, 2, 10, 10],
      [1, 3, 20, 10],
    ]);
  });

  it('flags filled, partial, and empty blocks', () => {
    const { plots } = pictogram([{ value: 3, filled: 1.5 }], { plots: true });
    expect(plots!.blocks.map((b) => [b.filled, b.empty, b.partial])).toEqual([
      [true, false, false],
      [false, false, true],
      [false, true, false],
    ]);
  });

  it('reflects the ring empty variant in the flags and color', () => {
    const scene = pictogram([{ value: 2, filled: 1 }], { emptyVariant: 'ring', plots: true });
    const blocks = scene.plots!.blocks;
    expect(blocks[0]!.filled).toBe(true);
    expect(blocks[1]!.empty).toBe(true);
    // A ring block renders with fill none and its paint as the stroke.
    const uses = scene.marks.filter((m) => m.type === 'use');
    expect(uses[1]!.fill).toBe('none');
    expect(blocks[1]!.color).toBe(uses[1]!.stroke);
  });

  it('reflects per-block styles in the color', () => {
    const { plots } = pictogram([3], {
      blockStyles: [{ span: [1, 2], color: 'red', variant: 'ring' }],
      plots: true,
    });
    expect(plots!.blocks[0]!.color).not.toBe('red');
    expect(plots!.blocks[1]!.color).toBe('red');
    expect(plots!.blocks[2]!.color).toBe('red');
  });

  it('includes connector lines when connectors are on', () => {
    const scene = pictogram([3, 2], { connector: {}, plots: true });
    expect(scene.plots!.connectors).toEqual([
      { x1: 4, y1: 20, x2: 4, y2: 18 },
      { x1: 4, y1: 10, x2: 4, y2: 8 },
      { x1: 14, y1: 20, x2: 14, y2: 18 },
    ]);
    // The plots lines are exactly the rendered line marks.
    const lines = scene.marks.filter((m) => m.type === 'line');
    expect(lines).toHaveLength(3);
    for (const [i, line] of lines.entries()) {
      const c = scene.plots!.connectors![i]!;
      expect([line.x1, line.y1, line.x2, line.y2]).toEqual([c.x1, c.y1, c.x2, c.y2]);
    }
  });

  it('subdivides explicit connector segments per gap', () => {
    const { plots } = pictogram([4], {
      connector: { segments: [{ span: [0, 3] }] },
      plots: true,
    });
    expect(plots!.connectors).toEqual([
      { x1: 4, y1: 30, x2: 4, y2: 28 },
      { x1: 4, y1: 20, x2: 4, y2: 18 },
      { x1: 4, y1: 10, x2: 4, y2: 8 },
    ]);
  });

  it('stops default connectors at the last filled block', () => {
    const { plots } = pictogram([{ value: 4, filled: 2 }], { connector: {}, plots: true });
    expect(plots!.connectors).toEqual([{ x1: 4, y1: 30, x2: 4, y2: 28 }]);
  });

  it('returns an empty payload for empty data', () => {
    const { plots } = pictogram([], { plots: true });
    expect(plots).toEqual({
      kind: 'pictogram',
      frame: { width: 0, height: 0, plot: { x: 0, y: 0, width: 0, height: 0 } },
      blocks: [],
    });
    expect('connectors' in plots!).toBe(false);
  });

  it('keeps full float precision where the scene rounds', () => {
    const scene = pictogram([1, 1], { blockSize: 7, gap: 0.333, plots: true });
    // Pitch is 7 + 0.333*7 = 9.331; the scene rounds the mark to 9.33.
    expect(scene.plots!.blocks[1]!.x).toBeCloseTo(9.331, 12);
    const uses = scene.marks.filter((m) => m.type === 'use');
    expect(uses[1]!.x).toBe(9.33);
  });

  it('leaves the scene byte-identical with the option off', () => {
    // Pinned idPrefix: the default one is a per-call counter, so two calls
    // would differ in their defs ids without it.
    const withPlots = pictogram([2, 3], { idPrefix: 'diff', plots: true });
    const without = pictogram([2, 3], { idPrefix: 'diff' });
    const { plots, ...stripped } = withPlots;
    expect(plots).toBeDefined();
    expect(stripped).toEqual(without);
    expect('plots' in pictogram([2, 3], { plots: false })).toBe(false);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });

  it('is identical with annotations on', () => {
    const base = pictogram([2, 3], { idPrefix: 'diff', plots: true }).plots;
    expect(
      pictogram([2, 3], {
        idPrefix: 'diff',
        plots: true,
        annotations: [{ x: 0, y: 1, shape: 'dot' }],
      }).plots,
    ).toEqual(base);
  });

  it('resolves overloads: plots:true returns plots, the default does not', () => {
    expectTypeOf(pictogram([1, 2], { plots: true }).plots).toEqualTypeOf<PictogramPlots>();
    expectTypeOf(pictogram([1, 2]).plots).toEqualTypeOf<Plots | undefined>();
    // A widened variable cannot resolve the overload: plots is then
    // `Plots | undefined`, the documented limitation.
    const opts: PictogramOptions = { plots: true };
    expectTypeOf(pictogram([1, 2], opts).plots).toEqualTypeOf<Plots | undefined>();
  });
});
