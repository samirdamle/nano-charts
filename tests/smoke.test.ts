import { describe, it, expect } from 'vitest';
import { version } from '../src/index';

describe('smoke', () => {
  it('exports a version string', () => {
    expect(typeof version).toBe('string');
  });
});
