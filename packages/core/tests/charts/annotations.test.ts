import { describe, it, expect } from 'vitest';
import { area } from '../../src/charts/area';
import { bar } from '../../src/charts/bar';
import { bullet } from '../../src/charts/bullet';
import { donut } from '../../src/charts/donut';
import { gauge } from '../../src/charts/gauge';
import { heatmap } from '../../src/charts/heatmap';
import { line } from '../../src/charts/line';
import { lines } from '../../src/charts/lines';
import { pictogram } from '../../src/charts/pictogram';
import { radar } from '../../src/charts/radar';
import { scatter } from '../../src/charts/scatter';
import { winLoss } from '../../src/charts/win-loss';
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

  it('tags donut annotations with their segment, angle still purely from y', () => {
    // donut([3, 1]): total 4, centre (10, 10), mid-ring 8.25, start −90°.
    // y=1 → 0° (east), y=2 → 90° (south); seriesIndex only picks the
    // segment colour, never the angle.
    const scene = donut([3, 1], {
      annotations: [
        { x: 0, y: 1, shape: 'dot', seriesIndex: 0 },
        { x: 0, y: 2, shape: 'dot', seriesIndex: 1 },
        { x: 0, y: 2, shape: 'dot', seriesIndex: 2 },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(2);
    const segments = scene.marks.filter((m) => cls(m).startsWith('nc-segment'));
    expect(ann[0]).toMatchObject({ cx: 18.25, cy: 10 });
    expect(ann[0]).toMatchObject({ fill: (segments[0] as { stroke?: string }).stroke });
    expect(ann[1]).toMatchObject({ cx: 10, cy: 18.25 });
    expect(ann[1]).toMatchObject({ fill: (segments[1] as { stroke?: string }).stroke });
  });

  it('places one annotation per series per x index on grouped bars', () => {
    // The user's example: one red dot for the 3rd bar of the blue series.
    const scene = bar(
      [
        [12, 9],
        [18, 14],
        [15, 12],
      ],
      {
        mode: 'grouped',
        annotations: [{ x: 2, y: 15, shape: 'dot', color: 'red', seriesIndex: 0 }],
      },
    );
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(1);
    const blueThird = scene.points.find((p) => p.col === 2 && p.row === 0)!;
    expect((ann[0] as { cx: number }).cx).toBeCloseTo(
      blueThird.x + (blueThird.w ?? 0) / 2,
      1,
    );
    expect(ann[0]).toMatchObject({ fill: 'red' });
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

describe('annotations v2: new chart mappings', () => {
  it('maps radar annotations to polar points, fractional axes included', () => {
    const scene = radar([3, 1, 2], {
      annotations: [
        { x: 0, y: 3, shape: 'dot' },
        { x: 1, y: 1.5, shape: 'dot' },
        { x: 0.5, y: 3, shape: 'dot' },
        { x: 3, y: 1, shape: 'dot' },
        { x: 0, y: 4, shape: 'dot' },
        { x: 0, y: -1, shape: 'dot' },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(3);
    // Axis 0 is north, domainMax 3, radius 49 (padding 1), center (50, 50).
    expect(ann[0]).toMatchObject({ cx: 50, cy: 1 });
    // Axis 1 at 30°, half radius.
    expect(ann[1]).toMatchObject({ cx: 71.22, cy: 62.25 });
    // Halfway between axes 0 and 1: -30°, full radius.
    expect(ann[2]).toMatchObject({ cx: 92.44, cy: 25.5 });
    expect(cls(ann[0])).toBe('nc-annotation nc-annotation-0');
    expect(cls(ann[2])).toBe('nc-annotation nc-annotation-2');
  });

  it('maps heatmap annotations to cell centers and drops missing cells', () => {
    const scene = heatmap([[1, 2], [3, 4]], {
      cellSize: 10,
      annotations: [
        { x: 1, y: 0, shape: 'dot' },
        { x: 0, y: 1, shape: 'dot' },
        { x: 2, y: 0, shape: 'dot' },
        { x: 0.5, y: 0, shape: 'dot' },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(2);
    expect(ann[0]).toMatchObject({ cx: 15, cy: 5 });
    expect(ann[1]).toMatchObject({ cx: 5, cy: 15 });

    const ragged = heatmap([[1], [2, 3, 4]], {
      cellSize: 10,
      annotations: [
        { x: 2, y: 0, shape: 'dot' },
        { x: 2, y: 1, shape: 'dot' },
      ],
    });
    const raggedAnn = annotationsOf(ragged);
    expect(raggedAnn).toHaveLength(1);
    expect(raggedAnn[0]).toMatchObject({ cx: 25, cy: 15 });
  });

  it('maps pictogram annotations to block slots, 1-based, horizontal included', () => {
    const scene = pictogram([3, 2], {
      blockSize: 8,
      annotations: [
        { x: 0, y: 1, shape: 'dot' },
        { x: 1, y: 2, shape: 'dot' },
        { x: 0, y: 4, shape: 'dot' },
        { x: 2, y: 1, shape: 'dot' },
        { x: 0, y: 0, shape: 'dot' },
        { x: 0, y: 1.5, shape: 'dot' },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(2);
    // Pitch 10, blocks stack upward: series 0 block 1 centers at (4, 24).
    expect(ann[0]).toMatchObject({ cx: 4, cy: 24 });
    expect(ann[1]).toMatchObject({ cx: 14, cy: 14 });

    const horizontal = pictogram([3, 2], {
      horizontal: true,
      blockSize: 8,
      annotations: [{ x: 1, y: 2, shape: 'dot' }],
    });
    expect(annotationsOf(horizontal)).toHaveLength(1);
    expect(annotationsOf(horizontal)[0]).toMatchObject({ cx: 14, cy: 14 });
  });

  it('maps bullet annotations to values on the centerline, y ignored', () => {
    const scene = bullet(
      { value: 60, target: 80, max: 100 },
      {
        annotations: [
          { x: 80, y: 0, shape: 'dot' },
          { x: 50, y: 999, shape: 'dot' },
          { x: 101, y: 0, shape: 'dot' },
          { x: -1, y: 0, shape: 'dot' },
        ],
      },
    );
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(2);
    // Plot box [1, 99]: value 80 maps to 79.4, centerline 10.
    expect(ann[0]).toMatchObject({ cx: 79.4, cy: 10 });
    expect(ann[1]).toMatchObject({ cx: 50, cy: 10 });
  });

  it('maps winLoss annotations to their index block by sign, y ignored', () => {
    const scene = winLoss([5, -3, 0], {
      annotations: [
        { x: 0, y: 0, shape: 'dot' },
        { x: 1, y: 0, shape: 'dot' },
        { x: 2, y: 0, shape: 'dot' },
        { x: 3, y: 0, shape: 'dot' },
        { x: 0.5, y: 0, shape: 'dot' },
      ],
    });
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(3);
    // Plot box [1, 99] x [1, 19]: slot 32.67, barW 26.13, centers
    // 17.34, 50, 82.67; win center 5.5, loss center 14.5, zero 10.
    expect(ann[0]).toMatchObject({ cx: 17.34, cy: 5.5 });
    expect(ann[1]).toMatchObject({ cx: 50, cy: 14.5 });
    expect(ann[2]).toMatchObject({ cx: 82.67, cy: 10 });
  });
});

describe('annotations v2: series targeting', () => {
  it('colors lines annotations by series and drops unknown series', () => {
    const scene = lines(
      [
        { data: [1, 2], color: 'red' },
        { data: [2, 1], color: 'blue' },
      ],
      {
        annotations: [
          { x: 0, y: 1, shape: 'dot', seriesIndex: 1 },
          { x: 0, y: 1, shape: 'dot', seriesIndex: 2 },
          { x: 0, y: 1, shape: 'dot', seriesIndex: 1.5 },
          { x: 0, y: 1, shape: 'dot' },
        ],
      },
    );
    const ann = annotationsOf(scene);
    expect(ann).toHaveLength(2);
    expect(ann[0]).toMatchObject({ fill: 'blue', class: 'nc-annotation nc-annotation-0' });
    expect(ann[1]).toMatchObject({ fill: 'currentColor', class: 'nc-annotation nc-annotation-3' });
  });

  it('moves grouped bar annotations onto the sub-bar, keeps stacked at category center', () => {
    const grouped = bar(
      [
        [3, 6],
        [9, 2],
      ],
      {
        mode: 'grouped',
        annotations: [{ x: 0, y: 5, shape: 'dot', seriesIndex: 1 }],
      },
    );
    const groupedAnn = annotationsOf(grouped);
    expect(groupedAnn).toHaveLength(1);
    // Column 0 bars at 7 and 27, width 16: sub-bar 1 centers at 35.
    expect(groupedAnn[0]).toMatchObject({ cx: 35 });
    const rects = grouped.marks.filter((m) => m.type === 'rect');
    expect(groupedAnn[0]).toMatchObject({ fill: (rects[1] as { fill?: string }).fill });

    const stacked = bar(
      [
        [3, 6],
        [9, 2],
      ],
      {
        annotations: [{ x: 0, y: 5, shape: 'dot', seriesIndex: 1 }],
      },
    );
    const stackedAnn = annotationsOf(stacked);
    expect(stackedAnn).toHaveLength(1);
    // Category center: slot starts at 5, barW 40.
    expect(stackedAnn[0]).toMatchObject({ cx: 25 });

    const ragged = bar(
      [
        [3, 6],
        [9],
      ],
      {
        mode: 'grouped',
        annotations: [
          { x: 1, y: 5, shape: 'dot', seriesIndex: 1 },
          { x: 0, y: 5, shape: 'dot', seriesIndex: 1 },
        ],
      },
    );
    const raggedAnn = annotationsOf(ragged);
    expect(raggedAnn).toHaveLength(1);
    expect(cls(raggedAnn[0])).toBe('nc-annotation nc-annotation-1');
  });

  it('accepts seriesIndex 0 on single-series charts and drops it on series-less charts', () => {
    const single = line([1, 2], {
      annotations: [
        { x: 0, y: 1, shape: 'dot', seriesIndex: 0 },
        { x: 0, y: 1, shape: 'dot', seriesIndex: 1 },
      ],
    });
    expect(annotationsOf(single)).toHaveLength(1);

    // Heatmap is series-less (x is the column, y the row), so seriesIndex
    // drops. Donut is no longer the series-less example: segmented donut
    // now honours seriesIndex (see the test above).
    const noSeries = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      {
        annotations: [{ x: 0, y: 0, shape: 'dot', seriesIndex: 0 }],
      },
    );
    expect(annotationsOf(noSeries)).toHaveLength(0);
  });
});

describe('annotations v2: reference lines', () => {
  it('draws full-span lines on line charts, drops out-of-domain ones, gaps preserved', () => {
    const scene = line([0, 10, 5], {
      referenceLines: [
        { value: 5, orientation: 'horizontal' },
        { value: 11, orientation: 'horizontal' },
        { value: 1, orientation: 'vertical', style: 'dashed', color: 'red', thickness: 2 },
        { value: 0.5, orientation: 'vertical' },
        { value: 3, orientation: 'vertical' },
      ],
      annotations: [{ x: 1, y: 10, shape: 'dot' }],
    });
    const ref = scene.marks.filter((m) => cls(m).includes('nc-reference-line'));
    expect(ref).toHaveLength(3);
    // Plot box [0.5, 99.5] x [0.5, 19.5]; value 5 maps to y 10.
    expect(ref[0]).toMatchObject({
      type: 'line',
      x1: 0.5,
      y1: 10,
      x2: 99.5,
      y2: 10,
      stroke: 'currentColor',
      strokeWidth: 1,
      class: 'nc-reference-line nc-reference-line-0',
    });
    expect(ref[1]).toMatchObject({
      type: 'line',
      x1: 50,
      y1: 0.5,
      x2: 50,
      y2: 19.5,
      stroke: 'red',
      strokeWidth: 2,
      strokeDasharray: '5 4',
      class: 'nc-reference-line nc-reference-line-2',
    });
    // Fractional index interpolates, like annotations.
    expect(ref[2]).toMatchObject({ x1: 25.25, x2: 25.25, class: 'nc-reference-line nc-reference-line-3' });
    // Layer order: after the data polyline, before the annotation.
    const polylineIdx = scene.marks.findIndex((m) => m.type === 'polyline');
    const annIdx = scene.marks.findIndex((m) => cls(m).includes('nc-annotation'));
    expect(scene.marks.indexOf(ref[0]!)).toBeGreaterThan(polylineIdx);
    expect(annIdx).toBeGreaterThan(scene.marks.indexOf(ref[2]!));
  });

  it('swaps the perpendicular axis on horizontal bars', () => {
    const scene = bar([10, 20], {
      horizontal: true,
      referenceLines: [
        { value: 15, orientation: 'vertical' },
        { value: 1, orientation: 'horizontal' },
        { value: 999, orientation: 'vertical' },
      ],
    });
    const ref = scene.marks.filter((m) => cls(m).includes('nc-reference-line'));
    expect(ref).toHaveLength(2);
    // Vertical line: constant x on the value axis, spanning the plot height.
    const vertical = ref[0] as { x1: number; x2: number; y1: number; y2: number };
    expect(vertical.x1).toBe(vertical.x2);
    expect(vertical.y1).toBeLessThan(vertical.y2);
    // Horizontal line: constant y on the category axis, spanning the width.
    const horizontal = ref[1] as { y1: number; y2: number; x1: number; x2: number };
    expect(horizontal.y1).toBe(horizontal.y2);
    expect(horizontal.x1).toBeLessThan(horizontal.x2);
  });

  it('draws scatter reference lines on both data scales', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 10],
      ],
      {
        referenceLines: [{ value: 5, orientation: 'horizontal' }],
      },
    );
    const ref = scene.marks.filter((m) => cls(m).includes('nc-reference-line'));
    expect(ref).toHaveLength(1);
    const horizontal = ref[0] as { y1: number; y2: number; x1: number; x2: number };
    expect(horizontal.y1).toBe(horizontal.y2);
    expect(horizontal.x1).toBeLessThan(horizontal.x2);
    expect(cls(ref[0])).toBe('nc-reference-line nc-reference-line-0');
  });
});

describe('annotations v2: interactive annotations', () => {
  it('exposes only interactive annotations in scene.annotationPoints', () => {
    const scene = line([0, 10, 5], {
      annotations: [
        { x: 1, y: 10, shape: 'dot', interactive: true, label: 'Peak' },
        { x: 0, y: 0, shape: 'dot' },
        { x: 5, y: 10, shape: 'dot', interactive: true },
      ],
    });
    expect(scene.annotationPoints).toEqual([{ annotationIndex: 0, x: 50, y: 0.5, label: 'Peak' }]);
    // Data points untouched.
    expect(scene.points).toHaveLength(3);
  });

  it('omits annotationPoints entirely when nothing is interactive', () => {
    const scene = line([0, 10, 5], {
      annotations: [{ x: 1, y: 10, shape: 'dot' }],
    });
    expect(scene.annotationPoints).toBeUndefined();
  });

  it('carries seriesIndex on interactive points', () => {
    const scene = lines(
      [
        { data: [1, 2], color: 'red' },
        { data: [2, 1], color: 'blue' },
      ],
      {
        annotations: [{ x: 0, y: 1, shape: 'dot', interactive: true, seriesIndex: 1 }],
      },
    );
    expect(scene.annotationPoints).toEqual([
      expect.objectContaining({ annotationIndex: 0, seriesIndex: 1 }),
    ]);
  });
});
