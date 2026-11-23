import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RadarNanoChart } from '../src/charts/RadarNanoChart';
import { radar } from '@samirdamle/nano-charts';

const series = [
  { data: [4, 9, 2], name: 'alpha' },
  { data: [7, 3, 8], name: 'beta', color: '#ff0000' },
];

describe('RadarNanoChart', () => {
  it('renders the same marks as the core radar() function, with correct a11y', () => {
    const { container } = render(<RadarNanoChart series={series} title="my chart" />);
    const scene = radar(series);
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('my chart');
  });

  it('accepts the single-series shorthand', () => {
    const { container } = render(<RadarNanoChart series={[4, 9, 2]} onPointHover={() => {}} />);
    const scene = radar([4, 9, 2]);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(3);
  });

  it('renders one hit target per axis per series', () => {
    const { container } = render(<RadarNanoChart series={series} onPointHover={() => {}} />);
    // 2 series × 3 axes.
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(6);
  });

  it('fires onPointHover with the point (including series metadata) on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<RadarNanoChart series={series} onPointHover={onPointHover} />);
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
    const { container } = render(<RadarNanoChart series={series} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, value: 4, seriesIndex: 0, seriesLabel: 'alpha' }),
    );
  });
});

describe('RadarNanoChart data alias + missing input (F4)', () => {
  it('accepts `data` as an alias for `series`, rendering identical marks', () => {
    const { container } = render(<RadarNanoChart data={series} />);
    const scene = radar(series);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
  });

  it('prefers `series` when both props are given', () => {
    const other = [{ data: [1, 1, 1], name: 'other' }];
    const { container } = render(<RadarNanoChart series={series} data={other} />);
    const scene = radar(series);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
  });

  it('renders the empty scene when neither prop is given instead of throwing', () => {
    const { container } = render(<RadarNanoChart width={140} height={90} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 140 90');
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(0);
  });
});
