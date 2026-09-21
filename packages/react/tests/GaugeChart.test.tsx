import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GaugeChart } from '../src/charts/GaugeChart';
import { gauge } from '@samirdamle/nano-charts';

describe('GaugeChart', () => {
  it('renders the same marks as the core gauge() function, with correct a11y', () => {
    const data = { value: 3, max: 4 };
    const { container } = render(<GaugeChart data={data} title="my gauge" />);
    const scene = gauge(data);
    expect(container.querySelectorAll('svg > path')).toHaveLength(
      scene.marks.filter((m) => m.type === 'path').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('my gauge');
    expect(container.querySelector('svg title')).toBeNull();
  });

  it('renders needle mode with zones and the center label', () => {
    const { container } = render(
      <GaugeChart
        data={{ value: 70, max: 100 }}
        mode="needle"
        zones={[
          { to: 60, color: 'green' },
          { to: 100, color: 'red' },
        ]}
        centerLabel="70%"
      />,
    );
    // 2 zone arcs + triangle needle path
    expect(container.querySelectorAll('svg > path')).toHaveLength(3);
    expect(container.querySelector('svg > circle:not([fill="transparent"])')).not.toBeNull(); // hub
    expect(container.querySelector('svg > text')?.textContent).toBe('70%');
  });

  it('fires onPointHover with the gauge point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = { value: 3, max: 4 };
    const { container } = render(<GaugeChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(1);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });
});
