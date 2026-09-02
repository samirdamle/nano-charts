import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChartSvg } from '../src/render/ChartSvg';
import type { Scene } from '@samirdamle/nano-charts';

const scene: Scene = {
  width: 100,
  height: 20,
  viewBox: '0 0 100 20',
  marks: [{ type: 'circle', cx: 10, cy: 10, r: 1, fill: 'currentColor' }],
  points: [{ id: 0, label: 'a', value: 1, index: 0, x: 10, y: 10 }],
  a11y: { title: 'test chart', desc: 'a test chart' },
};

describe('ChartSvg', () => {
  it('renders the svg wrapper with viewBox, role, title, desc, and marks', () => {
    const { container } = render(<ChartSvg scene={scene} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 20');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(container.querySelector('title')?.textContent).toBe('test chart');
    expect(container.querySelector('desc')?.textContent).toBe('a test chart');
    expect(container.querySelectorAll('svg > circle')).toHaveLength(1);
  });

  it('passes className and style to the root svg', () => {
    const { container } = render(<ChartSvg scene={scene} className="my-chart" style={{ color: 'red' }} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toBe('my-chart');
    expect(svg?.getAttribute('style')).toBe('color: red;');
  });

  it('wires onPointHover/onPointClick through to hit targets, defaulting hitRadius to 4', () => {
    const onPointHover = vi.fn();
    const { container } = render(<ChartSvg scene={scene} onPointHover={onPointHover} />);
    const hitTarget = container.querySelector('circle[fill="transparent"]');
    expect(hitTarget?.getAttribute('r')).toBe('4');
    fireEvent.mouseEnter(hitTarget!);
    expect(onPointHover).toHaveBeenCalledWith(scene.points[0]);
  });
});
