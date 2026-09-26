import { describe, it, expect } from 'vitest';
import { round, extent, linearScale } from '../../src/core/geometry';

describe('round', () => {
  it('rounds to 2 decimals by default', () => {
    expect(round(1.23456)).toBe(1.23);
    expect(round(19)).toBe(19);
  });
});

describe('extent', () => {
  it('returns [min, max]', () => {
    expect(extent([4, 9, 2, 7])).toEqual([2, 9]);
  });
  it('handles a single value', () => {
    expect(extent([5])).toEqual([5, 5]);
  });
  it('returns [0, 0] for empty input', () => {
    expect(extent([])).toEqual([0, 0]);
  });
});

describe('linearScale', () => {
  it('maps domain to range', () => {
    const s = linearScale([0, 10], [19, 1]);
    expect(s(0)).toBe(19);
    expect(s(10)).toBe(1);
    expect(s(5)).toBe(10);
  });
  it('returns range midpoint when domain is degenerate', () => {
    const s = linearScale([5, 5], [1, 19]);
    expect(s(5)).toBe(10);
  });
});
