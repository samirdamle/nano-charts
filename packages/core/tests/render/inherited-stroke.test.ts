import { describe, it, expect } from 'vitest';
import { toSVG } from '../../src/render/to-svg';
import { area } from '../../src/charts/area';
import { bar } from '../../src/charts/bar';
import { bullet } from '../../src/charts/bullet';
import { donut } from '../../src/charts/donut';
import { heatmap } from '../../src/charts/heatmap';
import { line } from '../../src/charts/line';
import { lines } from '../../src/charts/lines';
import { scatter } from '../../src/charts/scatter';
import { winLoss } from '../../src/charts/win-loss';

/**
 * Regression tests for #9: the root <svg> carries stroke="currentColor", so any
 * fill-based mark rendered without its own stroke attribute inherits an
 * unwanted border in the page's text color. Every mark in the rendered output
 * must therefore declare its stroke explicitly (stroke="none" for fill-only
 * marks), so the inheritance can never leak through.
 */

const MARK_RE = /<(path|rect|circle|line|polyline)\b[^>]*\/>/g;

function markElements(svg: string): string[] {
  return svg.match(MARK_RE) ?? [];
}

function expectNoInheritedStroke(svg: string): void {
  const marks = markElements(svg);
  expect(marks.length).toBeGreaterThan(0);
  for (const el of marks) {
    expect(el).toMatch(/\bstroke="/);
  }
}

describe('inherited-stroke regression (#9)', () => {
  it('scatter circles do not inherit the root stroke', () => {
    // Contrasting point color: with the bug, each point renders fill="#e11d48"
    // with no stroke attribute and picks up a currentColor (usually black) outline.
    const svg = toSVG(scatter([[0, 0], [5, 8], [10, 3]], { color: '#e11d48' }));
    expectNoInheritedStroke(svg);
    expect(svg).toContain('stroke="none"');
  });

  it('donut gauge track declares its own stroke', () => {
    const svg = toSVG(donut({ value: 62, max: 100 }));
    expectNoInheritedStroke(svg);
    // The track is a stroked ring, not a filled shape: it must carry an
    // explicit stroke rather than inheriting currentColor.
    expect(svg).toContain('stroke-opacity="0.25"');
  });

  it('donut segments declare their own stroke, including the striped variant', () => {
    // Uniform color + multiple segments -> alternating fillOpacity 1 / 0.55,
    // the exact case from #9 where an inherited stroke would outline segments.
    const svg = toSVG(donut([10, 20, 30], { color: '#2563eb' }));
    expectNoInheritedStroke(svg);
    expect(svg).toContain('stroke-opacity="0.55"');
  });

  it('stacked bar rects cannot inherit the root stroke', () => {
    // Stacked rows render at fillOpacity 0.4; an inherited stroke would draw a
    // border in an unrelated color over the translucent fill.
    const svg = toSVG(
      bar(
        [
          [1, 2],
          [3, 4],
        ],
        { color: '#2563eb' },
      ),
    );
    expectNoInheritedStroke(svg);
  });

  it('heatmap cells cannot inherit the root stroke', () => {
    // Cell fills come from a color scale, so an inherited currentColor outline
    // would be visually unrelated to the cell.
    const svg = toSVG(heatmap([[1, 2, 3], [4, 5, 6]]));
    expectNoInheritedStroke(svg);
  });

  it('win-loss rects cannot inherit the root stroke', () => {
    const svg = toSVG(winLoss([1, -1, 0.5, -0.5]));
    expectNoInheritedStroke(svg);
  });

  it('bullet rects and the target marker declare their own stroke', () => {
    const svg = toSVG(bullet({ value: 72, target: 80, ranges: [50, 75, 100] }));
    expectNoInheritedStroke(svg);
  });

  it('area fill declares stroke="none" and the line keeps its stroke', () => {
    const svg = toSVG(area([1, 3, 2, 5], { color: '#e11d48' }));
    expectNoInheritedStroke(svg);
    const paths = markElements(svg).filter((el) => el.startsWith('<path'));
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain('stroke="none"');
  });

  it('line and lines polylines keep their explicit stroke', () => {
    expectNoInheritedStroke(toSVG(line([1, 3, 2, 5], { color: '#e11d48' })));
    expectNoInheritedStroke(toSVG(lines([{ data: [1, 2, 3] }, { data: [3, 2, 1] }])));
  });

  it('center-label text cannot inherit the root stroke', () => {
    // A 1-unit inherited currentColor stroke on tiny label glyphs renders as
    // fat blobby outlines with miter-join spikes — the "thorny" label. <text>
    // is not self-closing, so it needs its own assertion.
    const svg = toSVG(donut({ value: 72, max: 100 }, { centerLabel: '72%' }));
    const textEls = svg.match(/<text\b[^>]*>/g) ?? [];
    expect(textEls.length).toBeGreaterThan(0);
    for (const el of textEls) {
      expect(el).toContain('stroke="none"');
    }
  });
});
