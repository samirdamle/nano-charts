import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ScatterChart } from '../src/charts/ScatterChart';
import { scatter } from '@samirdamle/nano-charts';

describe('ScatterChart', () => {
  it('renders one visual circle per point, matching the core scatter() function', () => {
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} />);
    const scene = scatter(data);
    expect(container.querySelectorAll('svg > circle')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(3);
    fireEvent.mouseEnter(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ index: 1, value: 4 }));
    fireEvent.mouseLeave(hitTargets[1]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const data: [number, number][] = [
      [1, 2],
      [3, 4],
      [5, 1],
    ];
    const { container } = render(<ScatterChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, value: 2 }));
  });
});
