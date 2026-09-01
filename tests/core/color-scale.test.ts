import { describe, it, expect } from 'vitest';
import { parseColor, lerpColor, makeColorScale } from '../../src/core/color-scale';

describe('parseColor', () => {
  it('parses #rrggbb', () => {
    expect(parseColor('#ff8800')).toEqual([255, 136, 0]);
  });
  it('parses shorthand #rgb', () => {
    expect(parseColor('#f80')).toEqual([255, 136, 0]);
  });
});

describe('lerpColor', () => {
  it('interpolates midway', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
  });
});

describe('makeColorScale', () => {
  it('maps domain endpoints to the two colors', () => {
    const scale = makeColorScale(['#000000', '#ffffff'], [0, 10]);
    expect(scale(0, { min: 0, max: 10 })).toBe('rgb(0,0,0)');
    expect(scale(10, { min: 0, max: 10 })).toBe('rgb(255,255,255)');
  });
  it('passes a custom function through', () => {
    const scale = makeColorScale(() => 'red', [0, 1]);
    expect(scale(0.5, { min: 0, max: 1 })).toBe('red');
  });
});
