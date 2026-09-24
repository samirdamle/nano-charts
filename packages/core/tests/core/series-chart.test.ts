import { describe, it, expect } from 'vitest';
import {
  singlePointDot,
  resolveChartShell,
  resolveA11y,
  sceneShell,
  renderSeriesChart,
} from '../../src/core/series-chart';

describe('singlePointDot', () => {
  it('builds a filled circle mark at the point', () => {
    expect(singlePointDot({ x: 5, y: 10 }, 2, 'red')).toEqual({
      type: 'circle',
      cx: 5,
      cy: 10,
      r: 2,
      fill: 'red',
    });
  });

  it('merges extra circle fields', () => {
    expect(singlePointDot({ x: 1, y: 2 }, 3, 'blue', { index: 4, seriesIndex: 1 })).toEqual({
      type: 'circle',
      cx: 1,
      cy: 2,
      r: 3,
      fill: 'blue',
      index: 4,
      seriesIndex: 1,
    });
  });
});

describe('resolveChartShell', () => {
  it('applies defaults when options are empty', () => {
    expect(resolveChartShell({})).toEqual({
      width: 100,
      height: 20,
      color: 'currentColor',
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
    });
  });

  it('honors explicit overrides', () => {
    expect(resolveChartShell({ width: 50, height: 10, color: 'red', padding: 2 })).toEqual({
      width: 50,
      height: 10,
      color: 'red',
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
    });
  });
});

describe('resolveA11y', () => {
  it('falls back to the series summary', () => {
    const datums = [
      { id: 0, label: '0', value: 0, index: 0 },
      { id: 1, label: '10', value: 10, index: 1 },
    ];
    expect(resolveA11y('line', datums, {})).toEqual({
      title: 'line chart',
      desc: 'line chart, 2 points, trend up, min 0, max 10',
    });
  });

  it('lets options override title and desc', () => {
    const datums = [{ id: 0, label: '0', value: 0, index: 0 }];
    expect(resolveA11y('line', datums, { title: 'Custom', desc: 'Custom desc' })).toEqual({
      title: 'Custom',
      desc: 'Custom desc',
    });
  });
});

describe('sceneShell', () => {
  it('builds an empty scene with the given dimensions and a11y', () => {
    expect(sceneShell({ width: 50, height: 10 }, { title: 't', desc: 'd' })).toEqual({
      width: 50,
      height: 10,
      viewBox: '0 0 50 10',
      marks: [],
      points: [],
      a11y: { title: 't', desc: 'd' },
    });
  });
});

describe('renderSeriesChart', () => {
  it('returns an empty scene without invoking the callback when data is empty', () => {
    let called = false;
    const scene = renderSeriesChart('line', [], {}, () => {
      called = true;
      return [];
    });
    expect(called).toBe(false);
    expect(scene).toEqual({
      width: 100,
      height: 20,
      viewBox: '0 0 100 20',
      marks: [],
      points: [],
      a11y: { title: 'line chart', desc: 'line chart, no data' },
    });
  });

  it('lays out points and hands them to the callback along with the resolved color', () => {
    const scene = renderSeriesChart('line', [0, 10, 5], { color: 'blue' }, (points, layout, color) => {
      expect(color).toBe('blue');
      expect(layout.left).toBe(1);
      return [{ type: 'circle', cx: points[0]!.x, cy: points[0]!.y, r: 1, fill: color }];
    });
    expect(scene.points).toEqual([
      { id: 0, label: '0', value: 0, index: 0, x: 1, y: 19 },
      { id: 1, label: '10', value: 10, index: 1, x: 50, y: 1 },
      { id: 2, label: '5', value: 5, index: 2, x: 99, y: 10 },
    ]);
    expect(scene.marks).toEqual([{ type: 'circle', cx: 1, cy: 19, r: 1, fill: 'blue' }]);
  });
});
