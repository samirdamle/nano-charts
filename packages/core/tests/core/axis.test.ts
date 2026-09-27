import { describe, it, expect } from 'vitest';
import { axisMarks, niceTicks } from '../../src/core/axis';
import { line } from '../../src/charts/line';
import { bar } from '../../src/charts/bar';
import { scatter } from '../../src/charts/scatter';
import type { AxisLayout } from '../../src/core/axis';

const layout: AxisLayout = {
  orientation: 'x',
  domain: [0, 100],
  scale: (v) => v,
  crossDomain: [0, 50],
  crossScale: (v) => 100 - v,
  span: [0, 100],
  crossSpan: [0, 100],
};

describe('niceTicks', () => {
  it('produces 1/2/5-step ticks covering the domain', () => {
    expect(niceTicks([0, 100], 5).ticks).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks([0, 100], 5).step).toBe(20);
    expect(niceTicks([3, 97], 5).ticks).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it('handles fractional domains', () => {
    const { ticks, step } = niceTicks([0, 1], 5);
    expect(step).toBe(0.2);
    expect(ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('returns nothing for degenerate domains', () => {
    expect(niceTicks([5, 5]).ticks).toEqual([]);
    expect(niceTicks([10, 0]).ticks).toEqual([]);
  });
});

describe('axisMarks', () => {
  it('returns empty marks unless show is set', () => {
    expect(axisMarks(undefined, layout)).toEqual({ grid: [], axis: [] });
    expect(axisMarks({ show: false }, layout)).toEqual({ grid: [], axis: [] });
    expect(axisMarks({}, layout)).toEqual({ grid: [], axis: [] });
  });

  it('draws the axis line at y=0 by default', () => {
    const { axis } = axisMarks({ show: true }, layout);
    expect(axis).toHaveLength(1);
    expect(axis[0]).toMatchObject({ type: 'line', x1: 0, y1: 100, x2: 100, y2: 100 });
  });

  it('positions the axis at a given data value, clamped to the domain', () => {
    const { axis } = axisMarks({ show: true, position: 20 }, layout);
    expect(axis[0]).toMatchObject({ y1: 80, y2: 80 });
    const { axis: clamped } = axisMarks({ show: true, position: 999 }, layout);
    expect(clamped[0]).toMatchObject({ y1: 50, y2: 50 });
  });

  it('supports ticks-only axes without an axis line', () => {
    const { axis } = axisMarks({ show: true, line: false, ticks: true }, layout);
    const lines = axis.filter((m) => m.type === 'line');
    expect(lines.length).toBeGreaterThan(0);
    // every line mark is a vertical tick; no horizontal axis line
    expect(lines.every((m) => m.type === 'line' && m.x1 === m.x2)).toBe(true);
  });

  it('draws ticks outward from the plot', () => {
    // axis at y=0 -> crossScale(0) = 100 = bottom edge -> ticks point down
    const { axis } = axisMarks({ show: true, ticks: [50] }, layout);
    const tick = axis.find((m) => m.type === 'line' && m.x1 === 50 && m.x1 === m.x2);
    expect(tick).toMatchObject({ y1: 100, y2: 104 });
  });

  it('applies custom colors and thickness', () => {
    const { axis } = axisMarks(
      { show: true, color: 'red', thickness: 2, ticks: [10], tickColor: 'blue', tickThickness: 3 },
      layout,
    );
    expect(axis[0]).toMatchObject({ stroke: 'red', strokeWidth: 2 });
    expect(axis[1]).toMatchObject({ stroke: 'blue', strokeWidth: 3 });
  });

  it('renders labels only when enabled', () => {
    const noLabels = axisMarks({ show: true, ticks: [25] }, layout);
    expect(noLabels.axis.some((m) => m.type === 'text')).toBe(false);
    const withLabels = axisMarks({ show: true, ticks: [25], labels: true }, layout);
    const text = withLabels.axis.find((m) => m.type === 'text');
    expect(text).toMatchObject({ text: '25', textAnchor: 'middle' });
    const custom = axisMarks({ show: true, ticks: [25], labels: (v) => `${v}%` }, layout);
    expect(custom.axis.find((m) => m.type === 'text')).toMatchObject({ text: '25%' });
  });

  it('formats automatic tick labels from the tick step', () => {
    const { axis } = axisMarks({ show: true, ticks: true, labels: true }, { ...layout, domain: [0, 1] });
    const texts = axis.filter((m) => m.type === 'text').map((m) => (m as { text: string }).text);
    expect(texts).toEqual(['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
  });

  it('draws gridlines spanning the plot, defaulting to automatic ticks', () => {
    const { grid } = axisMarks({ show: true, gridlines: { show: true, style: 'dashed' } }, layout);
    expect(grid.length).toBeGreaterThan(0);
    expect(grid[0]).toMatchObject({
      type: 'line',
      y1: 0,
      y2: 100,
      strokeDasharray: '5 4',
    });
  });

  it('supports dotted gridlines with round caps', () => {
    const { grid } = axisMarks({ show: true, gridlines: { show: true, style: 'dotted' } }, layout);
    expect(grid[0]).toMatchObject({ strokeDasharray: '0.1 4', strokeLinecap: 'round' });
  });

  it('snaps category ticks to integers', () => {
    const { axis } = axisMarks(
      { show: true, ticks: [0.4, 1.5, 2.6], labels: true },
      { ...layout, domain: [0, 3], integerTicks: true },
    );
    const texts = axis.filter((m) => m.type === 'text').map((m) => (m as { text: string }).text);
    expect(texts).toEqual(['0', '2', '3']);
  });
});

describe('chart integration', () => {
  it('line renders y-axis marks in front of data', () => {
    const scene = line([0, 10, 5], { yAxis: { show: true, ticks: true } });
    const lineIdx = scene.marks.findIndex((m) => m.type === 'polyline');
    const axisIdx = scene.marks.findIndex(
      (m) => m.type === 'line' && m.x1 === m.x2 && m.y1 !== m.y2,
    );
    expect(axisIdx).toBeGreaterThan(lineIdx);
  });

  it('line renders x gridlines behind data', () => {
    const scene = line([0, 10, 5], { xAxis: { show: true, gridlines: { show: true } } });
    const lineIdx = scene.marks.findIndex((m) => m.type === 'polyline');
    const gridIdx = scene.marks.findIndex(
      (m) => m.type === 'line' && m.x1 === m.x2 && m.y1 !== m.y2,
    );
    expect(gridIdx).toBeGreaterThanOrEqual(0);
    expect(gridIdx).toBeLessThan(lineIdx);
  });

  it('bar renders a category x-axis at the value baseline', () => {
    const scene = bar([3, 1, 2], { xAxis: { show: true } });
    const axisLine = scene.marks.find(
      (m) => m.type === 'line' && m.y1 === m.y2 && m.x1 !== m.x2,
    );
    // horizontal bar baseline: valueScale(0) with domain [0,3] over y [19,1]
    expect(axisLine).toMatchObject({ y1: 19, y2: 19 });
  });

  it('scatter renders both axes', () => {
    const scene = scatter(
      [
        [0, 0],
        [10, 10],
      ],
      { xAxis: { show: true }, yAxis: { show: true } },
    );
    const horizontals = scene.marks.filter((m) => m.type === 'line' && m.y1 === m.y2 && m.x1 !== m.x2);
    const verticals = scene.marks.filter((m) => m.type === 'line' && m.x1 === m.x2 && m.y1 !== m.y2);
    expect(horizontals.length).toBe(1);
    expect(verticals.length).toBe(1);
  });
});
