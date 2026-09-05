import { describe, it, expect } from 'vitest';
import { toSVG } from '../../src/render/to-svg';
import type { Scene } from '../../src/types';

const scene: Scene = {
  width: 100,
  height: 20,
  viewBox: '0 0 100 20',
  marks: [
    { type: 'polyline', points: [[1, 19], [50, 1], [99, 10]], fill: 'none' },
    { type: 'circle', cx: 99, cy: 10, r: 1 },
  ],
  points: [],
  a11y: { title: 'line chart', desc: 'line chart, 3 points, trend up, min 0, max 10' },
};

describe('toSVG', () => {
  it('wraps marks in an accessible svg with a viewBox', () => {
    const svg = toSVG(scene);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 20"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>line chart</title>');
    expect(svg).toContain('<desc>line chart, 3 points, trend up, min 0, max 10</desc>');
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('stroke="currentColor"');
  });

  it('serializes a polyline and a circle', () => {
    const svg = toSVG(scene);
    expect(svg).toContain('<polyline points="1,19 50,1 99,10" fill="none"');
    expect(svg).toContain('<circle cx="99" cy="10" r="1"');
  });

  it('is deterministic', () => {
    expect(toSVG(scene)).toBe(toSVG(scene));
  });

  it('applies className and extra attrs', () => {
    const svg = toSVG(scene, { className: 'spark', attrs: { width: 100, height: 20 } });
    expect(svg).toContain('class="spark"');
    expect(svg).toContain('width="100"');
  });

  it('escapes special characters in a11y text', () => {
    const svg = toSVG({ ...scene, a11y: { title: 'A & B <x>', desc: 'd' } });
    expect(svg).toContain('<title>A &amp; B &lt;x&gt;</title>');
  });

  it('escapes attribute values to prevent injection', () => {
    const malicious: Scene = {
      ...scene,
      marks: [{ type: 'circle', cx: 1, cy: 1, r: 1, fill: 'red" onload="alert(1)' }],
    };
    const svg = toSVG(malicious);
    expect(svg).not.toContain('onload="alert(1)"');
    expect(svg).toContain('fill="red&quot; onload=&quot;alert(1)"');
  });

  it('escapes className/style and drops invalid attr names', () => {
    const svg = toSVG(scene, {
      className: 'a"><b',
      attrs: { 'data-ok': 1, 'bad name': 2, 'x"><y': 3 },
    });
    expect(svg).toContain('class="a&quot;&gt;&lt;b"');
    expect(svg).toContain('data-ok="1"');
    expect(svg).not.toContain('bad name');
    expect(svg).not.toContain('x"><y');
  });

  it('serializes stroke-dasharray and stroke-linecap on a polyline', () => {
    const svg = toSVG({
      ...scene,
      marks: [
        {
          type: 'polyline',
          points: [[0, 0], [10, 10]],
          strokeDasharray: '4 2',
          strokeLinecap: 'round',
        },
      ],
    });
    expect(svg).toContain('stroke-dasharray="4 2"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('serializes data-index and data-series on a circle', () => {
    const svg = toSVG({
      ...scene,
      marks: [{ type: 'circle', cx: 5, cy: 5, r: 2, index: 3, seriesIndex: 1 }],
    });
    expect(svg).toContain('data-index="3"');
    expect(svg).toContain('data-series="1"');
  });

  it('omits stroke-dasharray/stroke-linecap/data-index/data-series when not set', () => {
    const svg = toSVG(scene);
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg).not.toContain('stroke-linecap');
    expect(svg).not.toContain('data-index');
    expect(svg).not.toContain('data-series');
  });

  it('always renders rect marks with stroke="none", overriding the inherited root stroke', () => {
    const svg = toSVG({
      ...scene,
      marks: [{ type: 'rect', x: 0, y: 0, width: 10, height: 5, fill: 'blue' }],
    });
    expect(svg).toContain('<rect x="0" y="0" width="10" height="5" fill="blue" stroke="none"/>');
  });

  it('serializes stroke-opacity on a path', () => {
    const svg = toSVG({
      ...scene,
      marks: [{ type: 'path', d: 'M0,0 A1,1 0 0 1 1,1', fill: 'none', stroke: 'red', strokeOpacity: 0.4 }],
    });
    expect(svg).toContain('stroke-opacity="0.4"');
  });
});
