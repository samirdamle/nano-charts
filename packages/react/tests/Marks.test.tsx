import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Marks } from '../src/render/Marks';
import type { Mark } from '@samirdamle/nano-charts';

describe('Marks', () => {
  it('renders a polyline mark', () => {
    const marks: Mark[] = [{ type: 'polyline', points: [[0, 0], [10, 10]], stroke: 'red', strokeWidth: 2 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('polyline');
    expect(el?.getAttribute('points')).toBe('0,0 10,10');
    expect(el?.getAttribute('stroke')).toBe('red');
    expect(el?.getAttribute('stroke-width')).toBe('2');
  });

  it('renders a path mark', () => {
    const marks: Mark[] = [{ type: 'path', d: 'M0,0 L10,10 Z', fill: 'blue', fillOpacity: 0.5 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('path');
    expect(el?.getAttribute('d')).toBe('M0,0 L10,10 Z');
    expect(el?.getAttribute('fill')).toBe('blue');
    expect(el?.getAttribute('fill-opacity')).toBe('0.5');
  });

  it('renders stroke-opacity on a path mark', () => {
    const marks: Mark[] = [
      { type: 'path', d: 'M0,0 A1,1 0 0 1 1,1', fill: 'none', stroke: 'red', strokeOpacity: 0.4 },
    ];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    expect(container.querySelector('path')?.getAttribute('stroke-opacity')).toBe('0.4');
  });

  it('renders a rect mark', () => {
    const marks: Mark[] = [{ type: 'rect', x: 1, y: 2, width: 3, height: 4, fill: 'green', rx: 1 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('rect');
    expect(el?.getAttribute('x')).toBe('1');
    expect(el?.getAttribute('width')).toBe('3');
    expect(el?.getAttribute('rx')).toBe('1');
  });

  it('always renders rect marks with stroke="none"', () => {
    const marks: Mark[] = [{ type: 'rect', x: 0, y: 0, width: 3, height: 4, fill: 'green' }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    expect(container.querySelector('rect')?.getAttribute('stroke')).toBe('none');
  });

  it('renders a circle mark', () => {
    const marks: Mark[] = [{ type: 'circle', cx: 5, cy: 5, r: 2, fill: 'purple' }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('circle');
    expect(el?.getAttribute('cx')).toBe('5');
    expect(el?.getAttribute('r')).toBe('2');
  });

  it('renders a line mark', () => {
    const marks: Mark[] = [{ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, stroke: 'black', strokeWidth: 1 }];
    const { container } = render(
      <svg>
        <Marks marks={marks} />
      </svg>,
    );
    const el = container.querySelector('line');
    expect(el?.getAttribute('x2')).toBe('10');
  });
});
