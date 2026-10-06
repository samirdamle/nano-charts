import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PictogramChart } from '../src/charts/PictogramChart';
import { pictogram } from '@samirdamle/nano-charts';

describe('PictogramChart', () => {
  it('renders the same marks as the core pictogram() function, with correct a11y', () => {
    const { container } = render(<PictogramChart data={[3, 2]} title="my chart" />);
    const scene = pictogram([3, 2]);
    expect(container.querySelectorAll('svg > defs')).toHaveLength(
      scene.marks.filter((m) => m.type === 'defs').length,
    );
    expect(container.querySelectorAll('svg > use')).toHaveLength(
      scene.marks.filter((m) => m.type === 'use').length,
    );
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('my chart');
    expect(container.querySelector('svg title')).toBeNull();
  });

  it('renders one hit target per block', () => {
    const { container } = render(<PictogramChart data={[2, 1]} onPointHover={() => {}} />);
    expect(container.querySelectorAll('circle[fill="transparent"]')).toHaveLength(3);
  });

  it('fires onPointHover with the point (including block metadata) on enter and null on leave', () => {
    const onPointHover = vi.fn();
    const { container } = render(<PictogramChart data={[2, 1]} onPointHover={onPointHover} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.mouseEnter(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(
      expect.objectContaining({ index: 2, value: 1, col: 1, blockNumber: 1, blocksTotal: 1 }),
    );
    fireEvent.mouseLeave(hitTargets[2]!);
    expect(onPointHover).toHaveBeenCalledWith(null);
  });

  it('fires onPointClick with the point', () => {
    const onPointClick = vi.fn();
    const { container } = render(<PictogramChart data={[2]} onPointClick={onPointClick} />);
    const hitTargets = container.querySelectorAll('circle[fill="transparent"]');
    fireEvent.click(hitTargets[1]!);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1, blockNumber: 2, blocksTotal: 2 }),
    );
  });

  it('renders partial blocks via a pre-clipped defs variant', () => {
    const { container } = render(<PictogramChart data={[2.5]} idPrefix="pictogram" />);
    // The clip lives on a <g> inside <defs>, never on <use> (clip-path on
    // <use> does not render in browsers).
    expect(container.querySelector('clipPath')).not.toBeNull();
    expect(container.querySelector('use[clip-path]')).toBeNull();
    const clipped = container.querySelector('g[id="pictogram-partial-0"]');
    expect(clipped?.getAttribute('clip-path')).toBe('url(#pictogram-partial-0-clip)');
    const overlay = container.querySelector('use[href="#pictogram-partial-0"]');
    expect(overlay).not.toBeNull();
  });

  it('renders emoji blocks', () => {
    const { container } = render(
      <PictogramChart data={[2]} block={{ kind: 'emoji', emoji: '⭐' }} />,
    );
    expect(container.querySelector('defs text')?.textContent).toBe('⭐');
  });

  it('passes connector options through to the rendered line marks', () => {
    const { container } = render(
      <PictogramChart
        data={[3, 2]}
        connector={{ color: 'red', thickness: 1.5, style: 'dashed' }}
      />,
    );
    const lines = container.querySelectorAll('svg > line');
    // [3, 2] → 2 gaps + 1 gap = 3 per-gap lines.
    expect(lines).toHaveLength(3);
    expect(lines[0]?.getAttribute('stroke')).toBe('red');
    expect(lines[0]?.getAttribute('stroke-width')).toBe('1.5');
    expect(lines[0]?.getAttribute('stroke-dasharray')).toBe('5 4');
  });

  it('passes connector segments through with per-segment colors', () => {
    const { container } = render(
      <PictogramChart
        data={[3]}
        connector={{ segments: [{ span: [0, 1], color: 'red' }, { span: [1, 2], color: 'blue' }] }}
      />,
    );
    const lines = container.querySelectorAll('svg > line');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute('stroke')).toBe('red');
    expect(lines[1]?.getAttribute('stroke')).toBe('blue');
  });
});
