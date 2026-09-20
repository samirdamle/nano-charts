import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { toSVG } from '@samirdamle/nano-charts';
import type { Mark, Scene } from '@samirdamle/nano-charts';
import { Marks } from '../src/render/Marks';

// Guards the to-svg.ts / Marks.tsx seam described in ADR 0002: both renderers
// hand-list which Mark fields they read, and nothing else keeps those two
// lists in sync. For each Mark variant this asserts the SVG-string renderer
// and the JSX renderer expose the same set of DOM attribute names, once with
// every optional field set ("full") and once with them all left undefined
// ("minimal") — the minimal case catches default-value drift (e.g. one
// renderer inventing a fallback the other doesn't apply) that the full case
// can't see.
//
// NOTE: fixtures below are maintained by hand against the Mark union in
// types.ts. Adding a field to a Mark variant without adding it here means
// this test can't catch drift on that field.

const scene = (marks: Mark[]): Scene => ({
  width: 100,
  height: 100,
  viewBox: '0 0 100 100',
  marks,
  points: [],
  a11y: { title: 't', desc: 'd' },
});

function svgAttrNames(mark: Mark, tag: string): string[] {
  const svg = toSVG(scene([mark]));
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.querySelector(tag);
  if (!el) throw new Error(`toSVG output has no <${tag}> element:\n${svg}`);
  return Array.from(el.attributes)
    .map((a) => a.name)
    .sort();
}

function jsxAttrNames(mark: Mark, tag: string): string[] {
  const { container } = render(
    <svg>
      <Marks marks={[mark]} />
    </svg>,
  );
  const el = container.querySelector(tag);
  if (!el) throw new Error(`Marks output has no <${tag}> element`);
  return Array.from(el.attributes)
    .map((a) => a.name)
    .sort();
}

function expectSameAttrs(mark: Mark, tag: string) {
  expect(jsxAttrNames(mark, tag)).toEqual(svgAttrNames(mark, tag));
}

describe('to-svg.ts / Marks.tsx attribute-set contract', () => {
  it('polyline: full fields', () => {
    expectSameAttrs(
      {
        type: 'polyline',
        points: [[0, 0], [10, 10]],
        stroke: 'red',
        strokeWidth: 2,
        fill: 'none',
        strokeDasharray: '4 2',
        strokeLinecap: 'round',
      },
      'polyline',
    );
  });

  it('polyline: minimal fields (only the required geometry)', () => {
    expectSameAttrs({ type: 'polyline', points: [[0, 0], [10, 10]] }, 'polyline');
  });

  it('path: full fields', () => {
    expectSameAttrs(
      {
        type: 'path',
        d: 'M0,0 L1,1',
        fill: 'blue',
        fillOpacity: 0.5,
        stroke: 'red',
        strokeWidth: 2,
        strokeOpacity: 0.4,
        strokeLinecap: 'round',
      },
      'path',
    );
  });

  it('path: minimal fields', () => {
    expectSameAttrs({ type: 'path', d: 'M0,0 L1,1' }, 'path');
  });

  it('rect: full fields', () => {
    expectSameAttrs(
      { type: 'rect', x: 0, y: 0, width: 10, height: 5, fill: 'green', fillOpacity: 0.8, rx: 2 },
      'rect',
    );
  });

  it('rect: minimal fields', () => {
    expectSameAttrs({ type: 'rect', x: 0, y: 0, width: 10, height: 5 }, 'rect');
  });

  it('circle: full fields', () => {
    expectSameAttrs(
      { type: 'circle', cx: 5, cy: 5, r: 2, fill: 'purple', stroke: 'black', strokeWidth: 1, index: 3, seriesIndex: 1 },
      'circle',
    );
  });

  it('circle: minimal fields', () => {
    expectSameAttrs({ type: 'circle', cx: 5, cy: 5, r: 2 }, 'circle');
  });

  it('line: full fields', () => {
    expectSameAttrs({ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, stroke: 'black', strokeWidth: 1 }, 'line');
  });

  it('line: minimal fields', () => {
    expectSameAttrs({ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }, 'line');
  });
});
