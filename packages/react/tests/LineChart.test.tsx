import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LineChart } from '../src/charts/LineChart';
import { line } from '@samirdamle/nano-charts';

describe('LineChart', () => {
  it('renders the same marks as the core line() function, with correct a11y', () => {
    const { container } = render(<LineChart data={[4, 9, 2, 7, 5]} dot="all" title="my chart" />);
    const scene = line([4, 9, 2, 7, 5], { dot: 'all' });
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('svg > circle')).toHaveLength(
      scene.marks.filter((m) => m.type === 'circle').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('title')?.textContent).toBe('my chart');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<LineChart data={[4, 9, 2]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: 9 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<LineChart data={[4, 9, 2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 4 }));
  });
});
