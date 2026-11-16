import { describe, it, expect } from 'vitest';
import { line } from '../../src/charts/line';
import { area } from '../../src/charts/area';
import { lines } from '../../src/charts/lines';
import { scatter } from '../../src/charts/scatter';
import { bar } from '../../src/charts/bar';
import { donut } from '../../src/charts/donut';
import { gauge } from '../../src/charts/gauge';
import { bullet } from '../../src/charts/bullet';
import { heatmap } from '../../src/charts/heatmap';
import { radar } from '../../src/charts/radar';
import { pictogram } from '../../src/charts/pictogram';
import { winLoss } from '../../src/charts/win-loss';
import { toSVG } from '../../src/render/to-svg';

// Final plots gate (#230): the whole feature, in one place — every chart's
// scene is byte-identical with the option off, and toSVG output is
// unchanged with plots on. Per-chart differential tests live in each
// plots-*.test.ts; this file is the cross-chart sweep that proves the
// feature, as shipped, lost no functionality anywhere.
describe('plots differential sweep', () => {
  it('line: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const off = line([0, 10, 5]);
    const on = line([0, 10, 5], { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('area: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const off = area([0, 10, 5]);
    const on = area([0, 10, 5], { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('lines: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = [
      { data: [3, 7, 2], name: 'alpha' },
      { data: [5, 4, 8], name: 'beta' },
    ];
    const off = lines(data);
    const on = lines(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('scatter: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data: [number, number][] = [
      [0, 0],
      [7, 7],
      [3, 3],
    ];
    const off = scatter(data);
    const on = scatter(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('bar: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const off = bar([4, 9, 2, 7]);
    const on = bar([4, 9, 2, 7], { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('bar grouped: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = [
      [3, 2],
      [5, 4],
    ];
    const off = bar(data, { mode: 'grouped' });
    const on = bar(data, { mode: 'grouped', plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('donut: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const off = donut([30, 70]);
    const on = donut([30, 70], { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('donut gauge-mode: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = { value: 3, max: 4 };
    const off = donut(data);
    const on = donut(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(plots!.kind).toBe('gauge');
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('gauge: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = { value: 82, max: 100 };
    const off = gauge(data);
    const on = gauge(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('bullet: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const off = bullet(data);
    const on = bullet(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('heatmap: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = [
      [1, 2],
      [3, 4],
    ];
    const off = heatmap(data);
    const on = heatmap(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('radar: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const data = [
      { data: [4, 9, 2], name: 'alpha' },
      { data: [7, 3, 8], name: 'beta' },
    ];
    const off = radar(data);
    const on = radar(data, { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('pictogram: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    // The default idPrefix is a per-call counter, so the two calls pin it.
    const off = pictogram([2, 3], { idPrefix: 'sweep' });
    const on = pictogram([2, 3], { idPrefix: 'sweep', plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });

  it('winLoss: scene byte-identical with plots off, toSVG unchanged with plots on', () => {
    const off = winLoss([1, -1, 0]);
    const on = winLoss([1, -1, 0], { plots: true });
    expect('plots' in off).toBe(false);
    const { plots, ...rest } = on;
    expect(plots).toBeDefined();
    expect(rest).toEqual(off);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off));
    expect(toSVG(on)).toBe(toSVG(off));
  });
});
