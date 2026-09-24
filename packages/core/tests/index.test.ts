import { describe, it, expect } from 'vitest';
import * as api from '../src/index';
import { toSVG, line, bar, donut, heatmap } from '../src/index';

describe('public API', () => {
  it('exports all nine charts plus toSVG', () => {
    for (const name of ['line', 'lines', 'area', 'bar', 'winLoss', 'bullet', 'donut', 'scatter', 'heatmap', 'toSVG']) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('charts compose with toSVG into valid svg strings', () => {
    expect(toSVG(line([1, 2, 3])).startsWith('<svg ')).toBe(true);
    expect(toSVG(bar([[1, 2], [3, 4]]))).toContain('<rect');
    expect(toSVG(donut({ value: 3, max: 4 }))).toContain('<path');
    expect(toSVG(heatmap([[1, 2]]))).toContain('<rect');
  });

  it('is deterministic end to end', () => {
    expect(toSVG(line([3, 1, 4, 1, 5]))).toBe(toSVG(line([3, 1, 4, 1, 5])));
  });
});
