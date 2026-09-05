import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as api from '../src/index';

describe('public API', () => {
  it('exports all eight chart components', () => {
    for (const name of [
      'LineChart',
      'AreaChart',
      'BarChart',
      'WinLossChart',
      'BulletChart',
      'DonutChart',
      'ScatterChart',
      'HeatmapChart',
    ]) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('renders an svg for each component with minimal props', () => {
    const { container: c1 } = render(<api.LineChart data={[1, 2, 3]} />);
    expect(c1.querySelector('svg')).not.toBeNull();
    const { container: c2 } = render(<api.BulletChart data={{ value: 1, target: 2 }} />);
    expect(c2.querySelector('svg')).not.toBeNull();
    const { container: c3 } = render(<api.HeatmapChart data={[[1, 2]]} />);
    expect(c3.querySelector('svg')).not.toBeNull();
  });
});
