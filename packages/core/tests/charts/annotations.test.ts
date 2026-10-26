import { describe, it, expect } from 'vitest';
import { area } from '../../src/charts/area';
import { bar } from '../../src/charts/bar';
import { donut } from '../../src/charts/donut';
import { gauge } from '../../src/charts/gauge';
import { line } from '../../src/charts/line';
import { lines } from '../../src/charts/lines';
import { scatter } from '../../src/charts/scatter';
import { toSVG } from '../../src/render/to-svg';
import type { Mark } from '../../src/types';

const cls = (m: Mark | undefined): string => (m as { class?: string } | undefined)?.class ?? '';

function annotationsOf(scene: { marks: Mark[] }) {
  return scene.marks.filter((m) => cls(m).includes('nc-annotation'));
}

describe('annotations', () => {
  it('renders every shape on a line chart at the mapped data point', () => {
    // line([0, 10, 5]) lays points out at (0.5, 19.5), (50, 0.5), (99.5, 10):
    // auto padding is the stroke half-width (0.5), not the old flat 1.
    const scene = line([0, 10, 5], {
      annotations: [
        { x: 1, y: 10, shape: 'dot' },
        { x: 0, y: 0, shape: 'square', size: 3, color: 'red' },
        { x: 2, y: 5, shape: 'triangle' },
        { x: 1, y: 5, shape: 'line' },
        { x: 1, y: 5, shape: 'line', orientation: 'vertical', color: 'blue' },
        { x: 1, y: 10, shape: 'emoji', emoji: '⚠️', size: 4 },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(6);
    // Annotations are the topmost layer: they come after the polyline.
    expect(scene.marks[scene.marks.length - 6]).toBe(ann[0]);
    expect(ann[0]).toMatchObject({
      type: 'circle',
      cx: 50,
      cy: 0.5,
      r: 2,
      fill: 'currentColor',
      class: 'nc-annotation nc-annotation-0',
    });
    expect(ann[1]).toMatchObject({
      type: 'rect',
      x: -2.5,
      y: 16.5,
      width: 6,
      height: 6,
      fill: 'red',
      class: 'nc-annotation nc-annotation-1',
    });
    expect(ann[2]).toMatchObject({
      type: 'path',
      d: 'M99.5,8L97.77,11L101.23,11Z',
      fill: 'currentColor',
      stroke: 'none',
      class: 'nc-annotation nc-annotation-2',
    });
    expect(ann[3]).toMatchObject({
      type: 'line',
      x1: 48,
      y1: 10,
      x2: 52,
      y2: 10,
      stroke: 'currentColor',
      strokeWidth: 1,
      class: 'nc-annotation nc-annotation-3',
    });
    expect(ann[4]).toMatchObject({
      type: 'line',
      x1: 50,
      y1: 8,
      x2: 50,
      y2: 12,
      stroke: 'blue',
      class: 'nc-annotation nc-annotation-4',
    });
    const emoji = ann[5]!;
    expect(emoji).toMatchObject({
      type: 'text',
      x: 50,
      y: 1.9,
      text: '⚠️',
      fontSize: 4,
      textAnchor: 'middle',
      class: 'nc-annotation nc-annotation-5',
    });
    // Emoji carries no fill: multicolour glyphs ignore it, monochrome
    // glyphs inherit currentColor like the chart's text.
    expect((emoji as { fill?: string }).fill).toBeUndefined();
  });

  it('interpolates fractional indices on line charts', () => {
    const scene = line([0, 10, 5], { annotations: [{ x: 0.5, y: 5, shape: 'dot' }] });
    expect(annotationsOf(scene)[0]).toMatchObject({ type: 'circle', cx: 25.25, cy: 10 });
  });

  it('drops out-of-range annotations instead of clamping them', () => {
    const scene = line([0, 10, 5], {
      annotations: [
        { x: 3, y: 5, shape: 'dot' },
        { x: -1, y: 5, shape: 'dot' },
        { x: 1, y: 11, shape: 'dot' },
        { x: 1, y: -1, shape: 'dot' },
        { x: Number.NaN, y: 5, shape: 'dot' },
      ],
    });
    expect(annotationsOf(scene)).toHaveLength(0);
  });

  it('drops unknown shapes and emoji annotations without an emoji, never throwing', () => {
    const scene = line([0, 10, 5], {
      annotations: [
        { x: 1, y: 5, shape: 'star' as never },
        { x: 1, y: 5, shape: 'emoji' },
        { x: 1, y: 5, shape: 'dot' },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(1);
    // The class index is the input position, so a dropped annotation
    // leaves a gap rather than renumbering the rest.
    expect(cls(ann[0])).toBe('nc-annotation nc-annotation-2');
  });

  it('falls back to size 2 for missing, zero, or non-finite sizes', () => {
    const scene = line([0, 10, 5], {
      annotations: [
        { x: 0, y: 0, shape: 'dot', size: 0 },
        { x: 1, y: 10, shape: 'dot', size: Number.NaN },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann[0]).toMatchObject({ r: 2 });
    expect(ann[1]).toMatchObject({ r: 2 });
  });

  it('does not change points, a11y, or existing marks', () => {
    const plain = line([0, 10, 5]);
    const annotated = line([0, 10, 5], { annotations: [{ x: 1, y: 10, shape: 'dot' }] });
    expect(annotated.points).toEqual(plain.points);
    expect(annotated.a11y).toEqual(plain.a11y);
    expect(annotated.marks.slice(0, plain.marks.length)).toEqual(plain.marks);
    expect(line([0, 10, 5], { annotations: [] }).marks).toEqual(plain.marks);
  });

  it('renders nothing for annotations on empty data, without throwing', () => {
    expect(line([], { annotations: [{ x: 0, y: 0, shape: 'dot' }] }).marks).toEqual([]);
  });

  it('works on area charts via the shared series scaffold', () => {
    const scene = area([0, 10, 5], { annotations: [{ x: 1, y: 10, shape: 'dot' }] });
    expect(annotationsOf(scene)[0]).toMatchObject({ type: 'circle', cx: 50, cy: 0.5 });
    expect(scene.marks[scene.marks.length - 1]).toBe(annotationsOf(scene)[0]);
  });

  it('uses the shared domain on lines charts, with no series targeting', () => {
    const scene = lines([{ data: [0, 10] }, { data: [10, 0] }], {
      annotations: [{ x: 1, y: 10, shape: 'dot', color: 'red' }],
    });
    expect(annotationsOf(scene)[0]).toMatchObject({ cx: 99.5, cy: 0.5, fill: 'red' });
  });

  it('places bar annotations at the category center, vertical and horizontal', () => {
    const vertical = bar([0, 10, 5], { annotations: [{ x: 1, y: 10, shape: 'dot' }] });
    const vPoint = vertical.points.find((p) => p.index === 1)!;
    const vAnn = annotationsOf(vertical)[0] as { cx: number; cy: number };
    expect(vAnn.cx).toBeCloseTo(vPoint.x + (vPoint.w ?? 0) / 2, 1);
    expect(vAnn.cy).toBe(vPoint.y);

    const horizontal = bar([0, 10, 5], {
      horizontal: true,
      annotations: [{ x: 1, y: 10, shape: 'dot' }],
    });
    const hPoint = horizontal.points.find((p) => p.index === 1)!;
    const hAnn = annotationsOf(horizontal)[0] as { cx: number; cy: number };
    expect(hAnn.cx).toBe(hPoint.x + (hPoint.w ?? 0));
    expect(hAnn.cy).toBeCloseTo(hPoint.y + (hPoint.h ?? 0) / 2, 1);
  });

  it('drops fractional and out-of-range bar annotations', () => {
    const scene = bar([0, 10, 5], {
      annotations: [
        { x: 1.5, y: 5, shape: 'dot' },
        { x: 3, y: 5, shape: 'dot' },
        { x: 1, y: 11, shape: 'dot' },
      ],
    });
    expect(annotationsOf(scene)).toHaveLength(0);
  });

  it('maps scatter annotations through both data scales', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 10],
      ],
      {
        annotations: [
          { x: 5, y: 5, shape: 'dot' },
          { x: 11, y: 5, shape: 'dot' },
        ],
      },
    );
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(1);
    expect(ann[0]).toMatchObject({ type: 'circle', cx: 50, cy: 10 });
  });

  it('maps donut annotations to angles on the ring, gauge and segmented', () => {
    // Default donut canvas is 20×20: center (10, 10), mid-ring radius 8.25,
    // startAngle −90°, full 360° span.
    const segmented = donut([3, 1], {
      annotations: [
        { x: 999, y: 1, shape: 'dot' },
        { x: 0, y: 2, shape: 'dot' },
        { x: 0, y: 5, shape: 'dot' },
      ],
    });
    const segAnn = annotationsOf(segmented);
    expect(segAnn).toHaveLength(2);
    // y=1 of total 4 → 0° (east); y=2 → 90° (south). x is ignored.
    expect(segAnn[0]).toMatchObject({ cx: 18.25, cy: 10 });
    expect(segAnn[1]).toMatchObject({ cx: 10, cy: 18.25 });

    const gaugeDonut = donut(
      { value: 50, max: 100 },
      { annotations: [{ x: 0, y: 25, shape: 'dot' }] },
    );
    expect(annotationsOf(gaugeDonut)[0]).toMatchObject({ cx: 18.25, cy: 10 });
    expect(donut([3, 1], { annotations: [] }).marks).toHaveLength(
      donut([3, 1]).marks.length,
    );
  });

  it('maps gauge annotations across [min, max] at the dial start/span', () => {
    // Gauge defaults: center (10, 10), mid-ring 8.25, start 135°, span 270°.
    const scene = gauge(
      { value: 72, max: 100 },
      {
        annotations: [
          { x: 0, y: 50, shape: 'dot' },
          { x: 0, y: 101, shape: 'dot' },
        ],
      },
    );
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(1);
    // y=50 → 135° + 135° = 270° (north).
    expect(ann[0]).toMatchObject({ cx: 10, cy: 1.75 });
  });

  it('renders annotations through toSVG with their generated classes', () => {
    const svg = toSVG(line([0, 10, 5], { annotations: [{ x: 1, y: 10, shape: 'dot' }] }));
    expect(svg).toContain('class="nc-annotation nc-annotation-0"');
  });
});
