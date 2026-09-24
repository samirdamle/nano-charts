import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PointHitTargets } from '../src/render/PointHitTargets';
import type { ScenePoint } from '@samirdamle/nano-charts';

const points: ScenePoint[] = [
  { id: 0, label: 'a', value: 1, index: 0, x: 10, y: 10 },
  { id: 1, label: 'b', value: 2, index: 1, x: 20, y: 20 },
];

describe('PointHitTargets', () => {
  it('renders nothing when neither onPointHover nor onPointClick is given', () => {
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} />
      </svg>,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders one transparent hit circle per point when a handler is given', () => {
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    expect(circles[0]?.getAttribute('r')).toBe('4');
  });

  it('stays invisible even when an ancestor sets a visible stroke', () => {
    // ChartSvg's root <svg> sets stroke="currentColor" for the chart's own marks.
    // stroke is an inherited SVG presentation property, so a hit circle with no
    // stroke of its own would otherwise paint a visible ring at fill="transparent".
    const { container } = render(
      <svg stroke="currentColor">
        <PointHitTargets points={points} hitRadius={4} onPointHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    for (const circle of circles) {
      expect(circle.getAttribute('stroke')).toBe('none');
    }
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointHover={onPointHover} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.mouseEnter(circles[1]!);
    expect(onPointHover).toHaveBeenCalledWith(points[1]);
    fireEvent.mouseLeave(circles[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(
      <svg>
        <PointHitTargets points={points} hitRadius={4} onPointClick={onPointClick} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(circles[0]!);
    expect(onPointClick).toHaveBeenCalledWith(points[0]);
  });
});
