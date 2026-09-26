import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BarChart } from '../src/charts/BarChart';
import { bar } from '@samirdamle/nano-charts';

describe('BarChart', () => {
  it('renders one rect per segment, matching the core bar() function', () => {
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} />);
    const scene = bar(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(
      scene.marks.filter((m) => m.type === 'rect').length,
    );
  });

  it('fires onPointHover with the segment point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ col: 0, row: 0, value: 1 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the segment point', () => {
    const onPointClick = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<BarChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ col: 1, row: 1, value: 4 }));
  });
});
