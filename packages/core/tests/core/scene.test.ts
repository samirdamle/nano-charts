import { describe, it, expect } from 'vitest';
import { finishScene } from '../../src/core/scene';
import { toSVG } from '../../src/render/to-svg';
import type { LinePlots, Mark, Scene } from '../../src/types';

const shell: Scene = {
  width: 100,
  height: 20,
  viewBox: '0 0 100 20',
  marks: [],
  points: [],
  a11y: { title: 'Line chart', desc: 'Line chart' },
};

const linePlots: LinePlots = {
  kind: 'line',
  frame: { width: 100, height: 20, plot: { x: 1, y: 1, width: 98, height: 18 } },
  series: [
    {
      seriesIndex: 0,
      points: [{ x: 1, y: 19, value: 1, index: 0, color: 'red' }],
    },
  ],
};

describe('finishScene plots (#216)', () => {
  it('omits plots when none are given', () => {
    const scene = finishScene(shell, [], [], [], []);
    expect('plots' in scene).toBe(false);
    expect(scene).toEqual(shell);
  });

  it('attaches plots when given', () => {
    const scene = finishScene(shell, [], [], [], [], linePlots);
    expect(scene.plots).toBe(linePlots);
  });

  it('attaches an empty plots payload when given one', () => {
    const empty: LinePlots = { kind: 'line', frame: linePlots.frame, series: [] };
    const scene = finishScene(shell, [], [], [], [], empty);
    expect(scene.plots).toEqual(empty);
  });

  it('keeps annotationPoints and plots independent', () => {
    const scene = finishScene(shell, [], [], [], [], linePlots);
    expect('annotationPoints' in scene).toBe(false);
    expect(scene.plots).toBe(linePlots);
  });
});

describe('toSVG with plots', () => {
  it('renders the same SVG with plots present as without', () => {
    const mark: Mark = { type: 'rect', x: 1, y: 1, width: 10, height: 5, fill: 'red' };
    const without = finishScene(shell, [mark], [], [], []);
    const withPlots = finishScene(shell, [mark], [], [], [], linePlots);
    expect(toSVG(withPlots)).toBe(toSVG(without));
  });
});
