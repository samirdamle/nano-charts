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
});
