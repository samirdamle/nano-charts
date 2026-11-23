import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LinesNanoChart } from '../src/charts/LinesNanoChart';
import { lines } from '@samirdamle/nano-charts';

const series = [
  { data: [3, 7, 2, 9], name: 'alpha' },
  { data: [5, 4, 8, 6], name: 'beta', color: '#ff0000' },
];

describe('LinesNanoChart', () => {
  it('renders the same marks as the core lines() function, with correct a11y', () => {
    const { container } = render(<LinesNanoChart data={series} title="my chart" />);
    const scene = lines(series);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('my chart');
  });

  it('fires onPointHover with the point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<LinesNanoChart data={series} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets.length).toBeGreaterThan(0);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ seriesIndex: 0, index: 0, value: 3 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('renders the empty scene when data is missing instead of throwing', () => {
    const { container } = render(<LinesNanoChart data={undefined as never} width={120} height={40} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 120 40');
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(0);
  });
});
