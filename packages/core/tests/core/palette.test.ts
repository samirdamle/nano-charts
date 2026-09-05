import { describe, it, expect } from 'vitest';
import { categoricalColor } from '../../src/core/palette';

describe('categoricalColor', () => {
  it('returns an hsl() string with saturation fixed at 60%', () => {
    expect(categoricalColor(0, 4)).toMatch(/^hsl\(\d+(\.\d+)?, 60%, \d+%\)$/);
  });

  it('spaces hues evenly around the full circle for the given total', () => {
    expect(categoricalColor(0, 4)).toBe('hsl(0, 60%, 30%)');
    expect(categoricalColor(1, 4)).toBe('hsl(90, 60%, 70%)');
    expect(categoricalColor(2, 4)).toBe('hsl(180, 60%, 30%)');
    expect(categoricalColor(3, 4)).toBe('hsl(270, 60%, 70%)');
  });

  it('alternates lightness between 30% and 70% by index parity', () => {
    expect(categoricalColor(0, 3)).toContain('30%)');
    expect(categoricalColor(1, 3)).toContain('70%)');
    expect(categoricalColor(2, 3)).toContain('30%)');
  });
});
