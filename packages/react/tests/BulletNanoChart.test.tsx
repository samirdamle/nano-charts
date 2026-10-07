import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BulletNanoChart } from '../src/charts/BulletNanoChart';
import { bullet } from '@samirdamle/nano-charts';

describe('BulletNanoChart', () => {
  it('renders the same marks as the core bullet() function', () => {
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletNanoChart data={data} />);
    const scene = bullet(data);
    expect(container.querySelectorAll('svg > rect')).toHaveLength(
      scene.marks.filter((m) => m.type === 'rect').length,
    );
    expect(container.querySelectorAll('svg > line')).toHaveLength(
      scene.marks.filter((m) => m.type === 'line').length,
    );
  });

  it('fires onPointHover with the value point on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletNanoChart data={data} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    expect(hitTargets).toHaveLength(1);
    fireEvent.mouseEnter(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(expect.objectContaining({ value: 7 }));
    fireEvent.mouseLeave(hitTargets[0]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the value point', () => {
    const onPointClick = vi.fn();
    const data = { value: 7, target: 8, ranges: [4, 6, 10] };
    const { container } = render(<BulletNanoChart data={data} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[0]!);
    expect(onPointClick).toHaveBeenCalledWith(expect.objectContaining({ value: 7 }));
  });
});
