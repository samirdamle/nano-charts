import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AreaChart } from '../src/charts/AreaChart';
import { area } from '@samirdamle/nano-charts';

describe('AreaChart', () => {
  it('renders the same marks as the core area() function', () => {
    const { container } = render(<AreaChart data={[4, 9, 2, 7, 5]} />);
    const scene = area([4, 9, 2, 7, 5]);
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<AreaChart data={[4, 9, 2]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 2, value: 2 }));
    fireEvent.mouseLeave(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<AreaChart data={[4, 9, 2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 4 }));
  });
});
