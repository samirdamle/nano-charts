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

  it('form 3: object color field is carried onto the datum', () => {
    const out = normalizeSeries([{ value: 5, color: 'red' }]);
    expect(out).toEqual([{ id: 0, label: '5', value: 5, index: 0, color: 'red' }]);
  });

  it('form 2: color accessor pulls color from arbitrary objects', () => {
    const rows = [{ sku: 'x', rev: 12, hex: '#fff' }];
    const out = normalizeSeries(rows, { value: (r) => r.rev, colorAccessor: (r) => r.hex });
    expect(out).toEqual([{ id: 0, label: '12', value: 12, index: 0, color: '#fff' }]);
  });

  it('omits color when none is given', () => {
    const out = normalizeSeries([{ value: 7 }]);
    expect(out[0]).not.toHaveProperty('color');
  });
});

describe('normalizeSeries (clamp policy)', () => {
  it('maps non-finite values to 0 instead of emitting NaN', () => {
    expect(normalizeSeries([1, NaN, Infinity]).map((d) => d.value)).toEqual([1, 0, 0]);
    expect(normalizeSeries([{ value: NaN }])[0]!.value).toBe(0);
    expect(normalizeSeries([{ v: NaN }], { value: (r) => r.v })[0]!.value).toBe(0);
  });

  it('tolerates null/undefined rows without throwing', () => {
    const out = normalizeSeries([null, undefined] as unknown as { value: number }[]);
    expect(out.map((d) => d.value)).toEqual([0, 0]);
  });
});
