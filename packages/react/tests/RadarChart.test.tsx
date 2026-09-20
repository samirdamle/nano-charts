import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RadarChart } from '../src/charts/RadarChart';
import { radar } from '@samirdamle/nano-charts';

const series = [
  { data: [4, 9, 2], name: 'alpha' },
  { data: [7, 3, 8], name: 'beta', color: '#ff0000' },
];

describe('RadarChart', () => {
  it('renders the same marks as the core radar() function, with correct a11y', () => {
    const { container } = render(<RadarChart series={series} title="my chart" />);
    const scene = radar(series);
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('title')?.textContent).toBe('my chart');
  });

  it('accepts the single-series shorthand', () => {
    const { container } = render(<RadarChart series={[4, 9, 2]} onPointHover={() => {}} />);
    const scene = radar([4, 9, 2]);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(3);
  });

  it('renders one hit target per axis per series', () => {
    const { container } = render(<RadarChart series={series} onPointHover={() => {}} />);
    // 2 series × 3 axes.
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(6);
  });

  it('fires onPointHover with the point (including series metadata) on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<RadarChart series={series} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.mouseEnter(hitTargets[4]!);
    expect(onPointHover).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1, value: 3, seriesIndex: 1, seriesLabel: 'beta' }),
    );
    fireEvent.mouseLeave(hitTargets[4]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<RadarChart series={series} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, value: 4, seriesIndex: 0, seriesLabel: 'alpha' }),
    );
  });
});
