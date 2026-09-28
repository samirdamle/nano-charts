import { describe, it, expect } from 'vitest';
import { axisSpace, type AxisLayout } from '../../src/core/axis';
import { autoPadding, fitAutoPadding, resolveAutoPadding } from '../../src/core/plot';
import { line } from '../../src/charts/line';
import { bar } from '../../src/charts/bar';
import { scatter } from '../../src/charts/scatter';
import { heatmap } from '../../src/charts/heatmap';
import type { Mark } from '../../src/types';

const xLayout: AxisLayout = {
  orientation: 'x',
  domain: [0, 100],
  scale: (v) => v,
  crossDomain: [0, 50],
  crossScale: (v) => 100 - v,
  span: [0, 100],
  crossSpan: [0, 100],
};

const yLayout: AxisLayout = {
  orientation: 'y',
  domain: [0, 100],
  scale: (v) => 100 - v,
  crossDomain: [0, 100],
  crossScale: (v) => v,
  span: [0, 100],
  crossSpan: [0, 100],
};

describe('autoPadding', () => {
  it('pads every side by the mark half-extent', () => {
    expect(autoPadding(1)).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
    expect(autoPadding(0)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('rounds padding up to one decimal', () => {
    expect(autoPadding(0.55)).toEqual({ top: 0.6, right: 0.6, bottom: 0.6, left: 0.6 });
    expect(autoPadding(0.5)).toEqual({ top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 });
  });

  it('clamps negative extents to zero', () => {
    expect(autoPadding(-2)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('takes the per-side max of mark extent and axis overflow', () => {
    const xSpace = { top: 0, right: 9, bottom: 18, left: 3 };
    const ySpace = { top: 0, right: 0, bottom: 0, left: 0 };
    expect(autoPadding(0.5, xSpace, ySpace)).toEqual({
      top: 0.5,
      right: 9,
      bottom: 18,
      left: 3,
    });
  });
});

describe('fitAutoPadding', () => {
  it('leaves fitting padding untouched', () => {
    const p = { top: 4.5, right: 9, bottom: 18, left: 20 };
    expect(fitAutoPadding(p, 100, 60)).toEqual(p);
  });

  it('shrinks the vertical pair proportionally when they exceed the height', () => {
    // 22.5px of vertical padding on a 20px chart -> 19px budget, scale 19/22.5.
    const p = fitAutoPadding({ top: 4.5, right: 9, bottom: 18, left: 20 }, 100, 20);
    expect(p.top + p.bottom).toBeCloseTo(19, 10);
    expect(p.top / 4.5).toBeCloseTo(p.bottom / 18, 10);
    expect(p.right).toBe(9);
    expect(p.left).toBe(20);
  });

  it('keeps at least 1px of plot in each dimension', () => {
    const p = fitAutoPadding({ top: 50, right: 50, bottom: 50, left: 50 }, 100, 20);
    expect(p.top + p.bottom).toBeLessThanOrEqual(20);
    expect(p.left + p.right).toBeLessThanOrEqual(100);
  });
});

describe('resolveAutoPadding', () => {
  const auto = { top: 1, right: 2, bottom: 3, left: 4 };

  it('returns the automatic padding when nothing is specified', () => {
    expect(resolveAutoPadding(undefined, auto)).toBe(auto);
  });

  it('applies a numeric padding to every side', () => {
    expect(resolveAutoPadding(6, auto)).toEqual({ top: 6, right: 6, bottom: 6, left: 6 });
  });

  it('lets a partial object override only the specified sides', () => {
    expect(resolveAutoPadding({ top: 10 }, auto)).toEqual({
      top: 10,
      right: 2,
      bottom: 3,
      left: 4,
    });
    expect(resolveAutoPadding({ left: 0, bottom: 0 }, auto)).toEqual({
      top: 1,
      right: 2,
      bottom: 0,
      left: 0,
    });
  });
});

describe('axisSpace', () => {
  it('returns zeros when the axis is hidden', () => {
    const zero = { top: 0, right: 0, bottom: 0, left: 0 };
    expect(axisSpace(undefined, xLayout)).toEqual(zero);
    expect(axisSpace({ show: false }, xLayout)).toEqual(zero);
    expect(axisSpace({}, xLayout)).toEqual(zero);
  });

  it('claims half the line thickness at the plot edge', () => {
    // x-axis defaults to y=0 -> crossScale(0) = 100 = bottom edge
    expect(axisSpace({ show: true }, xLayout)).toEqual({ top: 0, right: 0, bottom: 0.5, left: 0 });
  });

  it('claims the tick length for ticks-only axes', () => {
    // Edge ticks are half their thickness over the plot edge, so the tick
    // thickness claims 0.5 on the sides as well as 4 below.
    expect(axisSpace({ show: true, line: false, ticks: true }, xLayout)).toEqual({
      top: 0,
      right: 0.5,
      bottom: 4,
      left: 0.5,
    });
  });

  it('claims label height plus endpoint label overhang', () => {
    // ticks [0,20,...,100], labels "0".."100": bottom = 4 (tick) + 4 (gap) + 8 + 2;
    // first/last labels are centered on the edge, so half their width overhangs.
    expect(axisSpace({ show: true, ticks: true, labels: true }, xLayout)).toEqual({
      top: 0,
      right: 9,
      bottom: 18,
      left: 3,
    });
  });

  it('measures custom label formatters, not raw tick values', () => {
    const space = axisSpace(
      { show: true, ticks: [0, 100], labels: (v) => (v === 0 ? 'zero!' : 'one hundred') },
      xLayout,
    );
    expect(space).toEqual({ top: 0, right: 33, bottom: 18, left: 15 });
  });

  it('measures y-axis labels to the left, including vertical endpoint overhang', () => {
    // axis at x=0 (left edge): labels sit left of the ticks; the "100"
    // label (top tick) overhangs the top edge, "0" overhangs the bottom.
    expect(axisSpace({ show: true, ticks: true, labels: true }, yLayout)).toEqual({
      top: 4.5,
      right: 0,
      bottom: 5.5,
      left: 26,
    });
  });

  it('claims no cross-edge space for a mid-plot axis whose labels fit inside', () => {
    // position 25 -> y=75; labels end at 93 < 100, so bottom stays 0.
    // Endpoint labels still overhang left/right.
    expect(axisSpace({ show: true, position: 25, ticks: true, labels: true }, xLayout)).toEqual({
      top: 0,
      right: 9,
      bottom: 0,
      left: 3,
    });
  });
});

describe('automatic plot padding (charts)', () => {
  it('gives a stroked line half its stroke width per side with no axes', () => {
    const scene = line([0, 10, 5]);
    expect(scene.points[0]).toMatchObject({ x: 0.5, y: 19.5 });
    expect(scene.points[2]).toMatchObject({ x: 99.5, y: 10 });
  });

  it('gives a dotted line the dot radius per side', () => {
    const scene = line([0, 10, 5], { dot: 'all', dotRadius: 3 });
    expect(scene.points[0]).toMatchObject({ x: 3, y: 17 });
    expect(scene.points[2]).toMatchObject({ x: 97, y: 10 });
  });

  it('lets flush bars fill the whole chart with no axes', () => {
    const scene = bar([4, 9]);
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects[1]).toMatchObject({ y: 0, height: 20 });
  });

  it('gives scatter points their radius per side', () => {
    const scene = scatter(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      { radius: 2 },
    );
    const circles = scene.marks.filter((m) => m.type === 'circle');
    expect(circles[0]).toMatchObject({ cx: 2, cy: 18 });
  });

  it('lets an explicit numeric padding override the automatic one', () => {
    const scene = line([0, 10, 5], { padding: 4 });
    expect(scene.points[0]).toMatchObject({ x: 4, y: 16 });
  });

  it('lets a partial padding object override only the specified sides', () => {
    const scene = line([0, 10, 5], { padding: { left: 8 } });
    expect(scene.points[0]).toMatchObject({ x: 8, y: 19.5 });
  });

  it('grows heatmap dimensions to fit axis labels instead of shrinking cells', () => {
    const plain = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      { cellSize: 10 },
    );
    expect(plain.width).toBe(20);
    const labeled = heatmap(
      [
        [1, 2],
        [3, 4],
      ],
      {
        cellSize: 10,
        xAxis: { show: true, ticks: true, labels: true },
        yAxis: { show: true, ticks: true, labels: true },
      },
    );
    expect(labeled.width).toBeGreaterThan(20);
    expect(labeled.height).toBeGreaterThan(20);
  });
});

/** Rough bbox check: axis labels are the marks most likely to be clipped. */
function textOverflows(m: Mark, width: number, height: number): boolean {
  if (m.type !== 'text') return false;
  const fs = m.fontSize ?? 10;
  const w = m.text.length * fs * 0.6;
  const half = m.textAnchor === 'middle' ? w / 2 : m.textAnchor === 'end' ? w : 0;
  const x0 = m.x - half;
  const x1 = m.x + (m.textAnchor === 'middle' ? w / 2 : m.textAnchor === 'start' ? w : 0);
  return (
    x0 < -0.01 || x1 > width + 0.01 || m.y - fs * 0.8 < -0.01 || m.y + fs * 0.2 > height + 0.01
  );
}

describe('no-clipping with axes', () => {
  const axes = {
    xAxis: { show: true, ticks: true, labels: true },
    yAxis: { show: true, ticks: true, labels: true },
  };

  it('keeps every axis label inside the chart', () => {
    const scenes = [
      line([0, 10, 5, 8, 2], { ...axes, height: 60 }),
      bar([4, 9, 2, 7], { ...axes, height: 60 }),
      scatter(
        [
          { x: 0, y: 0 },
          { x: 100, y: 50 },
        ],
        { ...axes, radius: 2, height: 60 },
      ),
      heatmap(
        [
          [1, 2, 3],
          [4, 5, 6],
        ],
        { ...axes, cellSize: 12 },
      ),
    ];
    for (const scene of scenes) {
      const texts = scene.marks.filter((m) => m.type === 'text');
      expect(texts.length).toBeGreaterThan(0);
      for (const t of texts) {
        expect(textOverflows(t, scene.width, scene.height)).toBe(false);
      }
    }
  });

  it('never inverts the plot on a chart too small for its labels', () => {
    // 20px tall is not enough for 18px of x labels + 4.5px of y labels;
    // the padding shrinks so the plot keeps 1px instead of flipping.
    const scene = scatter(
      [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
      ],
      { ...axes, radius: 2 },
    );
    const pts = scene.points;
    expect(pts[0]!.y).toBeGreaterThan(pts[1]!.y); // y=0 stays below y=50
    expect(pts[0]!.x).toBeLessThan(pts[1]!.x);
  });
});
