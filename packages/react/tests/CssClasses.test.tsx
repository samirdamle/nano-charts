import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BarNanoChart } from '../src/charts/BarNanoChart';
import { LineNanoChart } from '../src/charts/LineNanoChart';

describe('CSS classes', () => {
  it('merges nc-chart, the className prop, and the core class option on the svg', () => {
    const { container } = render(<BarNanoChart data={[1, 2]} className="mine" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('nc-chart mine');
  });

  it('carries the core class option through to the svg', () => {
    // `class` flows via chart options into scene.svgClass and merges.
    const { container } = render(<BarNanoChart data={[1, 2]} class="opt" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('nc-chart opt');
  });

  it('emits generated classes on marks', () => {
    const { container } = render(<BarNanoChart data={[1, 2]} />);
    const bars = container.querySelectorAll('rect.nc-bar');
    expect(bars).toHaveLength(2);
    expect(bars[0]?.getAttribute('class')).toBe('nc-bar nc-series-0 nc-bar-0');
  });

  it('emits point classes on line chart dots', () => {
    const { container } = render(<LineNanoChart data={[1, 2, 3]} dot="all" />);
    const dots = container.querySelectorAll('circle.nc-point');
    expect(dots).toHaveLength(3);
    expect(dots[2]?.getAttribute('class')).toBe('nc-point nc-point-2');
    expect(container.querySelector('polyline')?.getAttribute('class')).toBe('nc-line');
  });
});
