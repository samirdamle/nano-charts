import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HitTargets } from '../src/render/HitTargets';
import type { SceneAnnotationPoint, ScenePoint } from '@samirdamle/nano-charts';

const points: ScenePoint[] = [
  { id: 0, label: 'a', value: 1, index: 0, x: 10, y: 10 },
  { id: 1, label: 'b', value: 2, index: 1, x: 20, y: 20 },
];

const annotationPoints: SceneAnnotationPoint[] = [
  { annotationIndex: 0, x: 30, y: 30, label: 'peak' },
  { annotationIndex: 1, x: 40, y: 40 },
];

describe('HitTargets', () => {
  it('renders nothing when neither onHover nor onClick is given', () => {
    const { container } = render(
      <svg>
        <HitTargets points={points} hitRadius={4} />
      </svg>,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders one transparent hit circle per point when a handler is given', () => {
    const { container } = render(
      <svg>
        <HitTargets points={points} hitRadius={4} onHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    expect(circles[0]?.getAttribute('r')).toBe('4');
  });

  it('leaves data-point circles unnamed even though ScenePoint.label is set', () => {
    // The point label is data, not an accessible name: only annotations pass
    // getAriaLabel, so point circles must not gain an aria-label.
    const { container } = render(
      <svg>
        <HitTargets points={points} hitRadius={4} onHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    for (const circle of circles) {
      expect(circle.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('stays invisible even when an ancestor sets a visible stroke', () => {
    // NanoChartSvg's root <svg> sets stroke="currentColor" for the chart's own marks.
    // stroke is an inherited SVG presentation property, so a hit circle with no
    // stroke of its own would otherwise paint a visible ring at fill="transparent".
    const { container } = render(
      <svg stroke="currentColor">
        <HitTargets points={points} hitRadius={4} onHover={() => {}} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    for (const circle of circles) {
      expect(circle.getAttribute('stroke')).toBe('none');
    }
  });

  it('fires onHover with the point on enter and null on leave', () => {
    const onHover = vi.fn();
    const { container } = render(
      <svg>
        <HitTargets points={points} hitRadius={4} onHover={onHover} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.mouseEnter(circles[1]!);
    expect(onHover).toHaveBeenCalledWith(points[1]);
    fireEvent.mouseLeave(circles[1]!);
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('fires onClick with the point', () => {
    const onClick = vi.fn();
    const { container } = render(
      <svg>
        <HitTargets points={points} hitRadius={4} onClick={onClick} />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(circles[0]!);
    expect(onClick).toHaveBeenCalledWith(points[0]);
  });

  it('names a labeled annotation circle and leaves an unlabeled one unnamed', () => {
    const { container } = render(
      <svg>
        <HitTargets
          points={annotationPoints}
          hitRadius={4}
          onHover={() => {}}
          getAriaLabel={(point) => point.label}
        />
      </svg>,
    );
    const circles = container.querySelectorAll('circle[fill="transparent"]');
    expect(circles).toHaveLength(2);
    expect(circles[0]?.getAttribute('aria-label')).toBe('peak');
    expect(circles[1]?.hasAttribute('aria-label')).toBe(false);
  });
});
