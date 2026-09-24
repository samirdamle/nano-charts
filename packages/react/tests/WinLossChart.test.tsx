import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WinLossChart } from '../src/charts/WinLossChart';
import { winLoss } from '@samirdamle/nano-charts';

describe('WinLossChart', () => {
  it('renders one rect per point, matching the core winLoss() function', () => {
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} />);
    const scene = winLoss(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: -2 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const data = [3, -2, 0, 5];
    const { container } = render(<WinLossChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 3, value: 5 }));
  });
});
