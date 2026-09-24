import { describe, it, expect } from 'vitest';
import { bullet } from '../../src/charts/bullet';

describe('bullet', () => {
  it('renders range bands, a value bar and a target tick', () => {
    const scene = bullet({ value: 80, target: 90, ranges: [50, 75, 100] });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const lines = scene.marks.filter((m) => m.type === 'line');
    expect(rects.length).toBe(3 + 1); // 3 bands + value bar
    expect(lines).toHaveLength(1); // target tick
  });

  it('scales the value bar to the width (max = 100)', () => {
    const scene = bullet({ value: 100, target: 90, ranges: [100] }, { width: 100, height: 20 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const valueBar = rects[rects.length - 1];
    // full width minus padding: left=1, right=99 -> width 98
    expect(valueBar).toMatchObject({ width: 98 });
  });

  it('exposes a single point carrying value and target', () => {
    const scene = bullet({ value: 80, target: 90, id: 'kpi', label: 'Revenue' });
    expect(scene.points).toHaveLength(1);
    expect(scene.points[0]).toMatchObject({ id: 'kpi', label: 'Revenue', value: 80 });
  });
});

describe('bullet (clamp policy)', () => {
  it('clamps a negative value to a zero-width bar instead of a negative width', () => {
    const scene = bullet({ value: -20, target: 90 }, { width: 100, height: 20 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const valueBar = rects[rects.length - 1];
    expect(valueBar).toMatchObject({ width: 0 });
    for (const r of rects) expect((r as { width: number }).width).toBeGreaterThanOrEqual(0);
  });

  it('clamps negative ranges to zero-width bands', () => {
    const scene = bullet({ value: 80, target: 90, ranges: [-50, 75] }, { width: 100, height: 20 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    for (const r of rects) expect((r as { width: number }).width).toBeGreaterThanOrEqual(0);
  });

  it('clamps a value above an explicit max to the full track width', () => {
    const scene = bullet({ value: 150, target: 90, max: 100 }, { width: 100, height: 20 });
    const rects = scene.marks.filter((m) => m.type === 'rect');
    const valueBar = rects[rects.length - 1];
    expect(valueBar).toMatchObject({ width: 98 }); // left=1, right=99
  });

  it('clamps a negative target tick to the left edge', () => {
    const scene = bullet({ value: 80, target: -10 }, { width: 100, height: 20 });
    const lines = scene.marks.filter((m) => m.type === 'line');
    expect(lines[0]).toMatchObject({ x1: 1, x2: 1 });
  });
});
