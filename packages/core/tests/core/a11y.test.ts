import { describe, it, expect } from 'vitest';
import { seriesSummary } from '../../src/core/a11y';

const d = (value: number, index: number) => ({ id: index, label: String(value), value, index });

describe('seriesSummary', () => {
  it('reports kind, count, trend, min and max', () => {
    const out = seriesSummary('line', [d(2, 0), d(9, 1)]);
    expect(out.title).toBe('line chart');
    expect(out.desc).toBe('line chart, 2 points, trend up, min 2, max 9');
  });

  it('detects a downward trend', () => {
    const out = seriesSummary('bar', [d(9, 0), d(2, 1)]);
    expect(out.desc).toContain('trend down');
  });

  it('reports flat when first equals last', () => {
    const out = seriesSummary('line', [d(5, 0), d(5, 1)]);
    expect(out.desc).toContain('trend flat');
  });

  it('handles an empty series', () => {
    expect(seriesSummary('line', [])).toEqual({
      title: 'line chart',
      desc: 'line chart, no data',
    });
  });
});
