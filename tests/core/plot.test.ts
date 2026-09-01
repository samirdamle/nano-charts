import { describe, it, expect } from 'vitest';
import { resolvePadding, seriesLayout } from '../../src/core/plot';

describe('resolvePadding', () => {
  it('expands a number to all sides', () => {
    expect(resolvePadding(2)).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });
  it('merges a partial object over the default', () => {
    expect(resolvePadding({ left: 4 }, 1)).toEqual({ top: 1, right: 1, bottom: 1, left: 4 });
  });
  it('uses the default of 1 when undefined', () => {
    expect(resolvePadding(undefined)).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
  });
});

describe('seriesLayout', () => {
  const box = { width: 100, height: 20, padding: { top: 1, right: 1, bottom: 1, left: 1 } };

  it('maps index across the inner width and value up the inner height', () => {
    const l = seriesLayout(3, [0, 10], box);
    expect(l.x(0)).toBe(1);
    expect(l.x(2)).toBe(99);
    expect(l.y(0)).toBe(19);
    expect(l.y(10)).toBe(1);
  });

  it('centers a single point horizontally', () => {
    const l = seriesLayout(1, [0, 10], box);
    expect(l.x(0)).toBe(50);
  });
});
