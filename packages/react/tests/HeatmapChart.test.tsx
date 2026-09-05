import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { HeatmapChart } from '../src/charts/HeatmapChart';
import { heatmap } from '@samirdamle/nano-charts';

describe('HeatmapChart', () => {
  it('renders one rect per cell, matching the core heatmap() function', () => {
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} />);
    const scene = heatmap(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(scene.marks.length);
  });

  it('fires onPointHover with the cell point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(4);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(
      expect.objectContaining({ row: 0, col: 0, value: 1 }),
    );
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the cell point', () => {
    const onPointClick = vi.fn();
    const data = [
      [1, 2],
      [3, 4],
    ];
    const { container } = render(<HeatmapChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[3]!);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ row: 1, col: 1, value: 4 }),
    );
  });
});
