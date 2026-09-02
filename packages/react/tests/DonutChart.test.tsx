import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DonutChart } from '../src/charts/DonutChart';
import { donut } from '@samirdamle/nano-charts';

describe('DonutChart', () => {
  it('renders the same arc paths as the core donut() function (gauge mode)', () => {
    const data = { value: 3, max: 4 };
    const { container } = render(<DonutChart data={data} />);
    const scene = donut(data);
    expect(container.querySelectorAll('svg > path')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the gauge point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = { value: 3, max: 4 };
    const { container } = render(<DonutChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(1);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the segment point (segment mode)', () => {
    const onPointClick = vi.fn();
    const data = [
      { id: 'a', label: 'A', value: 1 },
      { id: 'b', label: 'B', value: 3 },
    ];
    const { container } = render(<DonutChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(2);
    fireEvent.click(hitTargets[1]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', value: 3 }));
  });
});
