import { describe, it, expect } from 'vitest';
import {
  markClass,
  svgClass,
  line,
  lines,
  area,
  bar,
  winLoss,
  bullet,
  donut,
  gauge,
  scatter,
  heatmap,
  radar,
  pictogram,
  toSVG,
  type Mark,
} from '../src/index';

const cls = (m: Mark | undefined): string => (m as { class?: string } | undefined)?.class ?? '';

function markBy(scene: { marks: Mark[] }, kind: Mark['type'], nth = 0): Mark | undefined {
  return scene.marks.filter((m) => m.type === kind)[nth];
}

describe('markClass', () => {
  it('emits the kind class alone when no index is given', () => {
    expect(markClass('line')).toBe('nc-line');
  });

  it('pairs the kind class with the indexed class', () => {
    expect(markClass('point', 3)).toBe('nc-point nc-point-3');
  });

  it('inserts the series class between kind and indexed classes', () => {
    expect(markClass('point', 3, 1)).toBe('nc-point nc-series-1 nc-point-3');
  });

  it('appends extra classes verbatim', () => {
    expect(markClass('block', 2, undefined, 'nc-filled')).toBe('nc-block nc-block-2 nc-filled');
  });
});

describe('svgClass', () => {
  it('always includes nc-chart and merges scene and render classes', () => {
    expect(svgClass()).toBe('nc-chart');
    expect(svgClass('mine')).toBe('nc-chart mine');
    expect(svgClass('mine', 'extra')).toBe('nc-chart mine extra');
    expect(svgClass(undefined, 'extra')).toBe('nc-chart extra');
  });
});

describe('svg-level class option', () => {
  it('assigns BaseOptions.class to the svg, merged with nc-chart', () => {
    const svg = toSVG(line([1, 2], { class: 'revenue' }));
    expect(svg).toContain('<svg ');
    expect(svg).toContain('class="nc-chart revenue"');
  });

  it('merges the scene class with toSVG\'s className opt', () => {
    const svg = toSVG(line([1, 2], { class: 'revenue' }), { className: 'wide' });
    expect(svg).toContain('class="nc-chart revenue wide"');
  });

  it('emits nc-chart even without a custom class', () => {
    expect(toSVG(line([1, 2]))).toContain('class="nc-chart"');
  });
});

describe('generated mark classes', () => {
  it('line: nc-line on the path, nc-point pairs on dots', () => {
    const scene = line([1, 2, 3], { dot: 'all' });
    expect(cls(markBy(scene, 'polyline'))).toBe('nc-line');
    const dots = scene.marks.filter((m) => m.type === 'circle');
    expect(dots.map(cls)).toEqual(['nc-point nc-point-0', 'nc-point nc-point-1', 'nc-point nc-point-2']);
  });

  it('lines: series classes on multi-series marks', () => {
    const scene = lines([
      { name: 'a', data: [1, 2], dot: 'all' },
      { name: 'b', data: [3, 4], dot: 'all' },
    ]);
    const polys = scene.marks.filter((m) => m.type === 'polyline');
    expect(polys.map(cls)).toEqual(['nc-line nc-series-0', 'nc-line nc-series-1']);
    const dots = scene.marks.filter((m) => m.type === 'circle');
    expect(cls(dots[0])).toBe('nc-point nc-series-0 nc-point-0');
    expect(cls(dots[2])).toBe('nc-point nc-series-1 nc-point-2');
  });

  it('area: nc-area on the fill, nc-line on the stroke', () => {
    const scene = area([1, 2, 3]);
    expect(cls(markBy(scene, 'path'))).toBe('nc-area');
    expect(cls(markBy(scene, 'polyline'))).toBe('nc-line');
  });

  it('bar: nc-bar pairs on bars, nc-track on tracks, nc-connector on waterfall links', () => {
    const scene = bar([1, 2], { track: true });
    const bars = scene.marks.filter((m) => m.type === 'rect' && cls(m).includes('nc-bar'));
    expect(bars.map(cls)).toEqual(['nc-bar nc-series-0 nc-bar-0', 'nc-bar nc-series-0 nc-bar-1']);
    const tracks = scene.marks.filter((m) => m.type === 'rect' && cls(m).includes('nc-track'));
    expect(tracks.map(cls)).toEqual(['nc-track nc-series-0 nc-track-0', 'nc-track nc-series-0 nc-track-1']);

    const wf = bar(
      [
        { label: 'a', value: 5 },
        { label: 'b', value: -2 },
      ],
      { mode: 'waterfall' },
    );
    const conns = wf.marks.filter((m) => m.type === 'path' && cls(m).includes('nc-connector'));
    expect(conns.map(cls)).toEqual(['nc-connector nc-connector-0']);
  });

  it('winLoss: nc-bar pairs on bars', () => {
    const scene = winLoss([1, -1, 0]);
    const bars = scene.marks.filter((m) => m.type === 'rect');
    expect(bars.map(cls)).toEqual(['nc-bar nc-bar-0', 'nc-bar nc-bar-1', 'nc-bar nc-bar-2']);
  });

  it('bullet: nc-range, nc-bar, nc-target', () => {
    const scene = bullet({ value: 5, target: 7, ranges: [3, 6, 10] });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    expect(rects.map(cls)).toEqual([
      'nc-range nc-range-2',
      'nc-range nc-range-1',
      'nc-range nc-range-0',
      'nc-bar',
    ]);
    expect(cls(markBy(scene, 'line'))).toBe('nc-target');
  });

  it('donut: nc-segment pairs, nc-track, nc-label', () => {
    const scene = donut([1, 2, 3], { track: true, centerLabel: 'total' });
    const paths = scene.marks.filter((m) => m.type === 'path');
    expect(paths.map(cls)).toEqual([
      'nc-track',
      'nc-segment nc-segment-0',
      'nc-segment nc-segment-1',
      'nc-segment nc-segment-2',
    ]);
    expect(cls(markBy(scene, 'text'))).toBe('nc-label');
  });

  it('gauge: nc-track, nc-arc, nc-label in arc mode; nc-needle, nc-hub in needle mode', () => {
    const arcScene = gauge({ value: 0.6, max: 1 }, { centerLabel: '60%' });
    const paths = arcScene.marks.filter((m) => m.type === 'path').map(cls);
    expect(paths).toContain('nc-track');
    expect(paths).toContain('nc-arc');
    expect(cls(markBy(arcScene, 'text'))).toBe('nc-label');

    const zones = gauge({ value: 0.6, max: 1 }, { zones: [{ to: 0.5, color: 'red' }] });
    expect(zones.marks.filter((m) => m.type === 'path').map(cls)).toContain('nc-zone nc-zone-0');

    const needle = gauge({ value: 0.6, max: 1 }, { mode: 'needle' });
    expect(needle.marks.filter((m) => m.type === 'path').map(cls)).toContain('nc-needle');
    expect(cls(markBy(needle, 'circle'))).toBe('nc-hub');
  });

  it('scatter: nc-point pairs on dots', () => {
    const scene = scatter([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(scene.marks.filter((m) => m.type === 'circle').map(cls)).toEqual([
      'nc-point nc-point-0',
      'nc-point nc-point-1',
    ]);
  });

  it('heatmap: nc-cell pairs on cells', () => {
    const scene = heatmap([
      [1, 2],
      [3, 4],
    ]);
    expect(scene.marks.filter((m) => m.type === 'rect').map(cls)).toEqual([
      'nc-cell nc-cell-0',
      'nc-cell nc-cell-1',
      'nc-cell nc-cell-2',
      'nc-cell nc-cell-3',
    ]);
  });

  it('radar: nc-spoke, nc-ring, nc-area, nc-line, nc-point with series', () => {
    const scene = radar([{ data: [1, 2, 3], dot: 'all' }]);
    const paths = scene.marks.filter((m) => m.type === 'path').map(cls);
    expect(paths.filter((c) => c.startsWith('nc-spoke'))).toHaveLength(3);
    expect(paths.filter((c) => c.startsWith('nc-ring'))).toHaveLength(4);
    expect(paths).toContain('nc-area nc-series-0');
    const polys = scene.marks.filter((m) => m.type === 'polyline').map(cls);
    expect(polys).toEqual(['nc-line nc-series-0']);
    const dots = scene.marks.filter((m) => m.type === 'circle').map(cls);
    expect(dots[0]).toBe('nc-point nc-series-0 nc-point-0');
  });

  it('pictogram: nc-block pairs with state classes, nc-connector on gap lines', () => {
    const scene = pictogram([{ value: 4, filled: 2 }], { connector: {} });
    const uses = scene.marks.filter((m) => m.type === 'use').map(cls);
    expect(uses).toEqual([
      'nc-block nc-block-0 nc-filled',
      'nc-block nc-block-1 nc-filled',
      'nc-block nc-block-2 nc-empty',
      'nc-block nc-block-3 nc-empty',
    ]);
    const conns = scene.marks.filter((m) => m.type === 'line').map(cls);
    expect(conns).toEqual(['nc-connector nc-connector-0']);
  });

  it('pictogram partial blocks: empty layer vs partial layer', () => {
    const scene = pictogram([{ value: 2.5 }]);
    const uses = scene.marks.filter((m) => m.type === 'use').map(cls);
    expect(uses).toEqual([
      'nc-block nc-block-0 nc-filled',
      'nc-block nc-block-1 nc-filled',
      'nc-block nc-block-2 nc-empty',
      'nc-block nc-block-2 nc-partial',
    ]);
  });

  it('axes: nc-gridline, nc-axis, nc-tick, nc-label with orientation qualifiers', () => {
    const scene = line([1, 2, 3], {
      xAxis: { show: true, gridlines: { show: true }, ticks: true },
      yAxis: { show: true },
    });
    const svg = toSVG(scene);
    expect(svg).toContain('class="nc-gridline nc-gridline-0 nc-axis-x"');
    expect(svg).toContain('class="nc-axis nc-axis-x"');
    expect(svg).toContain('class="nc-axis nc-axis-y"');
    expect(svg).toContain('class="nc-tick nc-tick-0 nc-axis-x"');
  });

  it('highlights: nc-highlight pairs', () => {
    const scene = line([1, 2, 3], { highlights: [{ x: [0, 1], color: 'red' }] });
    const svg = toSVG(scene);
    expect(svg).toContain('class="nc-highlight nc-highlight-0"');
  });
});
