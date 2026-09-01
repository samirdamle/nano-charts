import { describe, it, expect } from 'vitest';
import { normalizeSeries } from '../../src/core/normalize';

describe('normalizeSeries', () => {
  it('form 1: number[] derives id and label from index/value', () => {
    expect(normalizeSeries([4, 9])).toEqual([
      { id: 0, label: '4', value: 4, index: 0 },
      { id: 1, label: '9', value: 9, index: 1 },
    ]);
  });

  it('form 3: {id,label,value}[] uses keys directly', () => {
    const out = normalizeSeries([{ id: 'a', label: 'Jan', value: 3 }]);
    expect(out).toEqual([{ id: 'a', label: 'Jan', value: 3, index: 0 }]);
  });

  it('form 3: missing id/label fall back to index/value', () => {
    const out = normalizeSeries([{ value: 7 }]);
    expect(out).toEqual([{ id: 0, label: '7', value: 7, index: 0 }]);
  });

  it('form 2: accessors pull value/label/id from arbitrary objects', () => {
    const rows = [{ sku: 'x', month: 'Jan', rev: 12 }];
    const out = normalizeSeries(rows, {
      value: (r) => r.rev,
      label: (r) => r.month,
      id: (r) => r.sku,
    });
    expect(out).toEqual([{ id: 'x', label: 'Jan', value: 12, index: 0 }]);
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeSeries([])).toEqual([]);
  });
});
