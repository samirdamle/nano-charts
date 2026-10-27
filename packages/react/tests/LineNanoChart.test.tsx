import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LineNanoChart } from '../src/charts/LineNanoChart';
import { line } from '@samirdamle/nano-charts';

describe('LineNanoChart', () => {
  it('renders the same marks as the core line() function, with correct a11y', () => {
    const { container } = render(<LineNanoChart data={[4, 9, 2, 7, 5]} dot="all" title="my chart" />);
    const scene = line([4, 9, 2, 7, 5], { dot: 'all' });
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('svg > circle')).toHaveLength(
      scene.marks.filter((m) => m.type === 'circle').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('my chart');
  });

  it('passes mode="spline" through to a smooth path mark', () => {
    const { container } = render(<LineNanoChart data={[4, 9, 2, 7, 5]} mode="spline" />);
    const scene = line([4, 9, 2, 7, 5], { mode: 'spline' });
    const paths = container.querySelectorAll('svg > path');
    expect(paths).toHaveLength(scene.marks.filter((m) => m.type === 'path').length);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(0);
    expect(paths[0]?.getAttribute('d')).toContain('C');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<LineNanoChart data={[4, 9, 2]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: 9 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('passes annotations through and keeps them out of the hit targets', () => {
    const { container } = render(
      <LineNanoChart
        data={[4, 9, 2]}
        annotations={[{ x: 1, y: 9, shape: 'emoji', emoji: '⚠️', size: 4 }]}
        onPointHover={vi.fn()}
      />,
    );
    // The annotation renders (classed), but adds no hit target: annotations
    // are visual-only in v1, so the 3 data points keep exactly 3 targets.
    expect(container.querySelectorAll('svg > text.nc-annotation')).toHaveLength(1);
    expect(container.querySelector('svg > text.nc-annotation')?.textContent).toBe('⚠️');
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(3);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<LineNanoChart data={[4, 9, 2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 4 }));
  });

  it('fires onAnnotationHover/onAnnotationClick for interactive annotations only', () => {
    const onAnnotationHover = vi.fn();
    const onAnnotationClick = vi.fn();
    const { container } = render(
      <LineNanoChart
        data={[4, 9, 2]}
        annotations={[
          { x: 1, y: 9, shape: 'dot', interactive: true, label: 'Peak' },
          { x: 0, y: 4, shape: 'dot' },
        ]}
        onPointHover={vi.fn()}
        onAnnotationHover={onAnnotationHover}
        onAnnotationClick={onAnnotationClick}
      />,
    );
    // 3 data targets + 1 annotation target (the non-interactive one adds none).
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(4);
    const annTarget = container.querySelector('circle[aria-label="Peak"]');
    expect(annTarget).not.toBeNull();
    fireEvent.mouseEnter(annTarget!);
    expect(onAnnotationHover).toHaveBeenCalledWith(
      expect.objectContaining({ annotationIndex: 0, label: 'Peak' }),
    );
    fireEvent.mouseLeave(annTarget!);
    expect(onAnnotationHover).toHaveBeenCalledWith(null);
    fireEvent.click(annTarget!);
    expect(onAnnotationClick).toHaveBeenCalledWith(expect.objectContaining({ annotationIndex: 0 }));
  });

  it('adds no annotation target when the annotation callbacks are absent', () => {
    const { container } = render(
      <LineNanoChart
        data={[4, 9, 2]}
        annotations={[{ x: 1, y: 9, shape: 'dot', interactive: true, label: 'Peak' }]}
        onPointHover={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(3);
    expect(container.querySelector('circle[aria-label="Peak"]')).toBeNull();
  });
});
