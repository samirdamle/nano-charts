import { describe, it, expect } from 'vitest';
import { pictogram } from '../../src/charts/pictogram';
import { toSVG } from '../../src/render/to-svg';
import { pastelColor } from '../../src/core/palette';
import type { Mark } from '../../src/types';

const uses = (scene: ReturnType<typeof pictogram>) =>
  scene.marks.filter((m) => m.type === 'use');
const defs = (scene: ReturnType<typeof pictogram>) =>
  scene.marks.filter((m) => m.type === 'defs');
const partialDefs = (scene: ReturnType<typeof pictogram>) =>
  defs(scene).filter((m) => m.clip !== undefined);

describe('pictogram', () => {
  it('returns an empty scene for empty input', () => {
    const scene = pictogram([]);
    expect(scene.marks).toEqual([]);
    expect(scene.points).toEqual([]);
    expect(scene.a11y.title).toBe('pictogram chart');
    expect(scene.a11y.desc).toBe('pictogram chart, no data');
  });

  it('emits one defs block and one use per block', () => {
    const scene = pictogram([3, 7], { padding: 0, idPrefix: 'pictogram' });
    expect(defs(scene)).toHaveLength(1);
    expect(defs(scene)[0]).toMatchObject({ id: 'pictogram-block', shape: 'rect', size: 8 });
    expect(uses(scene)).toHaveLength(10);
    expect(scene.points).toHaveLength(10);
  });

  it('lays out columns bottom-up with blockSize + fractional gap', () => {
    // blockSize 8, gap 0.25 → g = 2, pitch = 10.
    const scene = pictogram([2, 1], { blockSize: 8, gap: 0.25, padding: 0 });
    expect(scene.viewBox).toBe('0 0 18 18');
    const pos = uses(scene).map((m) => [m.x, m.y]);
    expect(pos).toEqual([
      [0, 10], // column 0, bottom block
      [0, 0], // column 0, top block
      [10, 10], // column 1, single block (bottom-aligned)
    ]);
  });

  it('transposes the layout when horizontal', () => {
    const scene = pictogram([2, 1], { blockSize: 8, gap: 0.25, padding: 0, horizontal: true });
    expect(scene.viewBox).toBe('0 0 18 18');
    const pos = uses(scene).map((m) => [m.x, m.y]);
    expect(pos).toEqual([
      [0, 0], // row 0, left block
      [10, 0], // row 0, right block
      [0, 10], // row 1, single block (left-aligned)
    ]);
    expect(scene.a11y.desc).toContain('2 rows');
  });

  it('scales block counts by unit', () => {
    const scene = pictogram([700, 350], { unit: 100, padding: 0 });
    // 7 full blocks + (3 full + 1 partial → 5 uses).
    expect(uses(scene)).toHaveLength(12);
    expect(scene.points).toHaveLength(11);
    expect(scene.points.map((p) => p.col)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
    expect(scene.points[10]).toMatchObject({ partial: true, value: 50 });
  });

  it('renders a partial block for fractional counts', () => {
    const scene = pictogram([3.5], { blockSize: 8, gap: 0.25, padding: 0, idPrefix: 'pictogram' });
    // defs (block + pre-clipped partial variant) + 3 full uses + dim remainder use + overlay use.
    expect(defs(scene)).toHaveLength(2);
    expect(uses(scene)).toHaveLength(5);
    expect(partialDefs(scene)).toHaveLength(1);
    // Vertical partial: filled bottom-up, so the clip rect sits at the bottom
    // of the block in local coordinates.
    expect(partialDefs(scene)[0]).toMatchObject({
      id: 'pictogram-partial-0',
      clip: { x: 0, y: 4, width: 8, height: 4 },
    });
    const partialUses = uses(scene).slice(3);
    expect(partialUses[0]).toMatchObject({ href: '#pictogram-block', fillOpacity: 0.25 });
    // The overlay references the pre-clipped variant with a plain <use> —
    // clip-path on <use> does not render in browsers.
    expect(partialUses[1]).toMatchObject({ href: '#pictogram-partial-0' });
    expect(partialUses[1]).not.toHaveProperty('clipPath');
    expect(partialUses[0]!.index).toBe(partialUses[1]!.index);
    const partialPoint = scene.points[3]!;
    expect(partialPoint).toMatchObject({ partial: true, value: 0.5, blockNumber: 4, blocksTotal: 4 });
    expect(scene.points.filter((p) => p.partial)).toHaveLength(1);
  });

  it('never puts clip-path on a <use> element', () => {
    // Regression test: clip-path directly on <use> renders nothing in
    // browsers, so partial overlays must reference a pre-clipped defs entry.
    const svg = toSVG(
      pictogram([4.5], { block: { kind: 'emoji', emoji: '⭐' }, blockSize: 16, horizontal: true, idPrefix: 'pictogram' }),
    );
    expect(svg).not.toMatch(/<use[^>]*clip-path/);
    expect(svg).toContain('<use href="#pictogram-partial-0"');
  });

  it('fills partial blocks left-to-right when horizontal', () => {
    const scene = pictogram([2.5], { blockSize: 8, gap: 0.25, padding: 0, horizontal: true, idPrefix: 'pictogram' });
    // Partial block is the rightmost; the clip covers the left half in the
    // block's local coordinates.
    expect(partialDefs(scene)[0]).toMatchObject({
      id: 'pictogram-partial-0',
      clip: { x: 0, y: 0, width: 4, height: 8 },
    });
  });

  it('snaps float dust at both ends of a fraction', () => {
    const almost = pictogram([2.9999999999]);
    expect(uses(almost)).toHaveLength(3);
    expect(partialDefs(almost)).toHaveLength(0);
    const dust = pictogram([2.0000000001]);
    expect(uses(dust)).toHaveLength(2);
    expect(partialDefs(dust)).toHaveLength(0);
  });

  it('supports circle and emoji blocks, and rounded rects', () => {
    const circle = pictogram([1], { block: { kind: 'circle' } });
    expect(defs(circle)[0]).toMatchObject({ shape: 'circle' });
    const rounded = pictogram([1], { block: { kind: 'rect', radius: 3 } });
    expect(defs(rounded)[0]).toMatchObject({ shape: 'rect', radius: 3 });
    const emoji = pictogram([1], { block: { kind: 'emoji', emoji: '⭐' } });
    expect(defs(emoji)[0]).toMatchObject({ shape: 'emoji', emoji: '⭐' });
    const emptyEmoji = pictogram([1], { block: { kind: 'emoji', emoji: '' } });
    expect(defs(emptyEmoji)[0]).toMatchObject({ shape: 'rect' });
  });

  it('uses a custom idPrefix for defs, uses, and partials', () => {
    const scene = pictogram([1.5], { idPrefix: 'mine' });
    expect(defs(scene)[0]!.id).toBe('mine-block');
    expect(uses(scene)[0]!.href).toBe('#mine-block');
    expect(uses(scene)[2]!.href).toBe('#mine-partial-0');
    expect(partialDefs(scene)[0]!.id).toBe('mine-partial-0');
  });

  it('clamps bad values to zero blocks', () => {
    const scene = pictogram([-3, NaN, Infinity, 2]);
    expect(uses(scene)).toHaveLength(2);
    expect(scene.points).toHaveLength(2);
    expect(defs(scene)).toHaveLength(1);
  });

  it('falls back to defaults for bad blockSize, gap, and unit', () => {
    const scene = pictogram([2], { blockSize: -5, gap: NaN, unit: 0, padding: 0 });
    expect(scene.viewBox).toBe('0 0 8 18'); // defaults: size 8, gap 0.25
    expect(uses(scene)).toHaveLength(2);
  });

  it('resolves column colors with datum > uniform > pastel palette precedence', () => {
    const explicit = pictogram([{ value: 1, color: '#111' }, 1]);
    expect(uses(explicit)[0]!.fill).toBe('#111');
    expect(uses(explicit)[1]!.fill).toBe(pastelColor(1));

    const uniform = pictogram([1, 1], { color: '#222' });
    for (const u of uses(uniform)) expect(u.fill).toBe('#222');

    const palette = pictogram([1, 1]);
    expect(uses(palette)[0]!.fill).toBe(pastelColor(0));
    expect(uses(palette)[1]!.fill).toBe(pastelColor(1));
  });

  it('accepts object data with labels and accessors', () => {
    const scene = pictogram([{ label: 'A', value: 2 }]);
    expect(scene.points[0]).toMatchObject({ label: 'A', col: 0 });
    const via = pictogram([{ v: 3 }], { value: (d) => d.v });
    expect(uses(via)).toHaveLength(3);
  });

  it('defaults blocks to the pastel palette, cycling past five columns', () => {
    const scene = pictogram([1, 1, 1, 1, 1, 1, 1]);
    const fills = scene.marks
      .filter((m) => m.type === 'use')
      .map((m) => (m as { fill?: string }).fill);
    expect(fills).toEqual([
      '#8fe6c4',
      '#f3a8c7',
      '#7fd8e6',
      '#c6a6e8',
      '#f0dd82',
      '#8fe6c4',
      '#f3a8c7',
    ]);
  });

  it('passes the real category index to accessor callbacks', () => {
    const seen: number[] = [];
    const data = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const scene = pictogram(data, {
      value: (d, i) => {
        seen.push(i);
        return d.v;
      },
      label: (d, i) => `row-${i}`,
      colorAccessor: (d, i) => ['red', 'green', 'blue'][i]!,
    });
    expect(seen).toEqual([0, 1, 2]);
    expect(scene.points.map((p) => p.label)).toEqual([
      'row-0',
      'row-1',
      'row-1',
      'row-2',
      'row-2',
      'row-2',
    ]);
    // Color precedence check below relies on per-category accessor colors.
    const colors = scene.marks
      .filter((m) => m.type === 'use')
      .map((m) => (m as { fill?: string }).fill);
    expect(colors).toEqual(['red', 'green', 'green', 'blue', 'blue', 'blue']);
    // One point per block, ids keyed by column and block number.
    expect(scene.points.map((p) => p.id)).toEqual(['0:0', '1:0', '1:1', '2:0', '2:1', '2:2']);
  });

  it('emits one point per block with block metadata', () => {
    const scene = pictogram([{ label: 'A', value: 2 }, { label: 'B', value: 1 }], { padding: 0 });
    expect(scene.points.map((p) => [p.col, p.blockNumber, p.blocksTotal])).toEqual([
      [0, 1, 2],
      [0, 2, 2],
      [1, 1, 1],
    ]);
    expect(scene.points[0]!.partial).toBeUndefined();
    // Hit-target centers land in the middle of each block.
    expect([scene.points[0]!.x, scene.points[0]!.y]).toEqual([4, 14]);
  });

  it('summarizes columns and counts in the a11y desc', () => {
    const scene = pictogram([3, 7.5, 2]);
    expect(scene.a11y.desc).toBe('pictogram chart, 3 columns, counts 3, 7.5, 2');
    const custom = pictogram([1], { title: 'ratings', desc: 'custom' });
    expect(custom.a11y.title).toBe('ratings');
    expect(custom.a11y.desc).toBe('custom');
  });

  it('is deterministic', () => {
    // Same input + same explicit idPrefix → byte-identical output. Two calls
    // with the default prefix intentionally differ: ids are unique per chart.
    const a = toSVG(pictogram([3, 2.5, 1], { idPrefix: 'pictogram' }));
    const b = toSVG(pictogram([3, 2.5, 1], { idPrefix: 'pictogram' }));
    expect(a).toBe(b);
  });

  it('renders defs/use and the pre-clipped partial variant in the SVG string', () => {
    const svg = toSVG(pictogram([2.5], { blockSize: 8, gap: 0.25, padding: 0, idPrefix: 'pictogram' }));
    expect(svg).toContain('<defs><rect id="pictogram-block" width="8" height="8"/></defs>');
    expect(svg).toContain('<use href="#pictogram-block" x="0" y="10"');
    expect(svg).toContain('data-index="0"');
    expect(svg).toContain(
      '<defs><clipPath id="pictogram-partial-0-clip"><rect x="0" y="4" width="8" height="4"/></clipPath>' +
        '<g id="pictogram-partial-0" clip-path="url(#pictogram-partial-0-clip)">' +
        '<rect width="8" height="8"/></g></defs>',
    );
    expect(svg).toContain('<use href="#pictogram-partial-0"');
    expect(svg).not.toMatch(/<use[^>]*clip-path/);
    expect(svg).toContain('fill-opacity="0.25"');
  });

  it('renders circle and emoji defs in the SVG string', () => {
    const circle = toSVG(pictogram([1], { block: { kind: 'circle' }, blockSize: 10 }));
    expect(circle).toMatch(/<circle id="pictogram-\d+-block" cx="5" cy="5" r="5"\/>/);
    const emoji = toSVG(pictogram([1], { block: { kind: 'emoji', emoji: '⭐' }, blockSize: 10 }));
    expect(emoji).toMatch(/<text id="pictogram-\d+-block" font-size="10" y="8">⭐<\/text>/);
  });

  it('generates a unique default idPrefix per chart so inlined pictograms keep their own defs', () => {
    const rectChart = toSVG(pictogram([1], { block: { kind: 'rect' } }));
    const circleChart = toSVG(pictogram([1], { block: { kind: 'circle' } }));
    const idOf = (svg: string) => svg.match(/id="(pictogram-\d+-block)"/)?.[1];
    const rectId = idOf(rectChart);
    const circleId = idOf(circleChart);
    expect(rectId).toBeTruthy();
    expect(circleId).toBeTruthy();
    expect(rectId).not.toBe(circleId);
    // each chart's <use> elements resolve to their own defs, document-wide
    expect(rectChart).toContain(`href="#${rectId}"`);
    expect(circleChart).toContain(`href="#${circleId}"`);
    expect(circleChart).not.toContain(`href="#${rectId}"`);
  });

  it('generates unique partial ids per chart for partial blocks', () => {
    const partialOf = (svg: string) => svg.match(/id="(pictogram-\d+-partial-0)"/)?.[1];
    const a = partialOf(toSVG(pictogram([1.5])));
    const b = partialOf(toSVG(pictogram([2.5])));
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('keeps use marks working when the defs id needs escaping', () => {
    const svg = toSVG(pictogram([1], { idPrefix: 'a&b' }));
    expect(svg).toContain('id="a&amp;b-block"');
    expect(svg).toContain('href="#a&amp;b-block"');
  });
});

describe('pictogram mark types', () => {
  it('exposes the new variants on the Mark union', () => {
    const marks: Mark[] = [
      { type: 'defs', id: 'p-block', shape: 'rect', size: 8 },
      {
        type: 'defs',
        id: 'p-partial-0',
        shape: 'rect',
        size: 8,
        clip: { x: 0, y: 4, width: 8, height: 4 },
      },
      { type: 'use', href: '#p-block', x: 0, y: 0, fill: 'red', index: 0 },
      { type: 'use', href: '#p-partial-0', x: 0, y: 0, fill: 'red', index: 0 },
    ];
    const svg = toSVG({ width: 8, height: 8, viewBox: '0 0 8 8', marks, points: [], a11y: { title: 't', desc: 'd' } });
    expect(svg).toContain('<defs><rect id="p-block" width="8" height="8"/></defs>');
    expect(svg).toContain(
      '<defs><clipPath id="p-partial-0-clip"><rect x="0" y="4" width="8" height="4"/></clipPath>' +
        '<g id="p-partial-0" clip-path="url(#p-partial-0-clip)"><rect width="8" height="8"/></g></defs>',
    );
    expect(svg).toContain('<use href="#p-block" x="0" y="0" fill="red" stroke="none" data-index="0"/>');
    expect(svg).toContain('<use href="#p-partial-0" x="0" y="0" fill="red" stroke="none" data-index="0"/>');
  });
});
