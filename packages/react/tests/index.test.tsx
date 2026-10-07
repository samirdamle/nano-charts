import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as api from '../src/index';

describe('public API', () => {
  it('exports all nine chart components', () => {
    for (const name of [
      'LineNanoChart',
      'AreaNanoChart',
      'BarNanoChart',
      'WinLossNanoChart',
      'BulletNanoChart',
      'DonutNanoChart',
      'ScatterNanoChart',
      'HeatmapNanoChart',
      'RadarNanoChart',
    ]) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('renders an svg for each component with minimal props', () => {
    const { container: c1 } = render(<api.LineNanoChart data={[1, 2, 3]} />);
    expect(c1.querySelector('svg')).not.toBeNull();
    const { container: c2 } = render(<api.BulletNanoChart data={{ value: 1, target: 2 }} />);
    expect(c2.querySelector('svg')).not.toBeNull();
    const { container: c3 } = render(<api.HeatmapNanoChart data={[[1, 2]]} />);
    expect(c3.querySelector('svg')).not.toBeNull();
  });
});
