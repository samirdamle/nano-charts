import { describe, it, expect } from 'vitest';
import { round, extent, linearScale, splinePath } from '../../src/core/geometry';

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

describe('splinePath', () => {
  it('returns an empty string for fewer than 2 points', () => {
    expect(splinePath([])).toBe('');
    expect(splinePath([[1, 2]])).toBe('');
  });

  it('draws a straight cubic between two points', () => {
    expect(
      splinePath([
        [1, 19],
        [99, 1],
      ]),
    ).toBe('M1,19 C17.33,16 82.67,4 99,1');
  });

  it('emits one cubic segment per point gap and passes through every point', () => {
    const d = splinePath([
      [1, 19],
      [50, 1],
      [99, 10],
    ]);
    expect(d.startsWith('M1,19')).toBe(true);
    expect(d.match(/ C/g)).toHaveLength(2);
    // each segment ends exactly on its data point
    expect(d).toContain(' 50,1');
    expect(d.endsWith(' 99,10')).toBe(true);
  });

  it('rounds control points to 2 decimals', () => {
    const d = splinePath([
      [0, 0],
      [10, 10],
      [21, 0],
    ]);
    expect(d).toBe('M0,0 C1.67,1.67 6.5,10 10,10 C13.5,10 19.17,1.67 21,0');
  });
});
