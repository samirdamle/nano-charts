import { describe, it, expect, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import { render } from '@testing-library/react';
import { LineNanoChart } from '../src/charts/LineNanoChart';
import { AreaNanoChart } from '../src/charts/AreaNanoChart';
import { LinesNanoChart } from '../src/charts/LinesNanoChart';
import { ScatterNanoChart } from '../src/charts/ScatterNanoChart';
import { BarNanoChart } from '../src/charts/BarNanoChart';
import { DonutNanoChart } from '../src/charts/DonutNanoChart';
import { GaugeNanoChart } from '../src/charts/GaugeNanoChart';
import { BulletNanoChart } from '../src/charts/BulletNanoChart';
import { HeatmapNanoChart } from '../src/charts/HeatmapNanoChart';
import { RadarNanoChart } from '../src/charts/RadarNanoChart';
import { PictogramNanoChart } from '../src/charts/PictogramNanoChart';
import { WinLossNanoChart } from '../src/charts/WinLossNanoChart';
import { line, type LinePlots } from '@samirdamle/nano-charts';

// The React route to plots: onPlots fires (after mount) with the chart's
// typed plots when they were computed (`plots: true`), and never otherwise.
describe('onPlots', () => {
  it('fires with the line plots when plots:true (real component)', () => {
    const onPlots = vi.fn();
    const { container } = render(
      <LineNanoChart data={[0, 10, 5]} plots onPlots={onPlots} />,
    );
    expect(onPlots).toHaveBeenCalledTimes(1);
    expect(onPlots).toHaveBeenCalledWith(line([0, 10, 5], { plots: true }).plots);
    // The callback is peeled off, not leaked into the core options: the
    // rendered marks are exactly the core scene's.
    const scene = line([0, 10, 5]);
    expect(container.querySelectorAll('svg > polyline')).toHaveLength(
      scene.marks.filter((m) => m.type === 'polyline').length,
    );
  });

  it('is not fired without plots:true', () => {
    const onPlots = vi.fn();
    render(<LineNanoChart data={[0, 10, 5]} onPlots={onPlots} />);
    expect(onPlots).not.toHaveBeenCalled();
    render(<LineNanoChart data={[0, 10, 5]} plots={false} onPlots={onPlots} />);
    expect(onPlots).not.toHaveBeenCalled();
  });

  it('is not fired for null/undefined data', () => {
    const onPlots = vi.fn();
    render(
      <LineNanoChart data={null as unknown as number[]} plots onPlots={onPlots} />,
    );
    render(
      <LineNanoChart data={undefined as unknown as number[]} plots onPlots={onPlots} />,
    );
    expect(onPlots).not.toHaveBeenCalled();
  });

  it('is typed per chart: a LinePlots callback is accepted', () => {
    // This compiles only because LineNanoChart's onPlots takes LinePlots,
    // not the Plots union — a (plots: Plots) => void prop would reject it.
    const onPlots = vi.fn((plots: LinePlots) => plots);
    render(<LineNanoChart data={[0, 10, 5]} plots onPlots={onPlots} />);
    const received = onPlots.mock.calls[0]![0]!;
    expectTypeOf(received).toEqualTypeOf<LinePlots>();
    expect(received.series[0]!.points).toHaveLength(3);
  });

  it('fires once with the right kind on every component', () => {
    const cases: {
      kind: string;
      make: (onPlots: ReturnType<typeof vi.fn>) => React.ReactElement;
    }[] = [
      {
        kind: 'line',
        make: (onPlots) => <LineNanoChart data={[0, 10, 5]} plots onPlots={onPlots} />,
      },
      {
        kind: 'area',
        make: (onPlots) => <AreaNanoChart data={[0, 10, 5]} plots onPlots={onPlots} />,
      },
      {
        kind: 'lines',
        make: (onPlots) => (
          <LinesNanoChart
            data={[
              { data: [3, 7, 2], name: 'alpha' },
              { data: [5, 4, 8], name: 'beta' },
            ]}
            plots
            onPlots={onPlots}
          />
        ),
      },
      {
        kind: 'scatter',
        make: (onPlots) => (
          <ScatterNanoChart
            data={[
              [0, 0],
              [5, 5],
            ]}
            plots
            onPlots={onPlots}
          />
        ),
      },
      {
        kind: 'bar',
        make: (onPlots) => <BarNanoChart data={[4, 9, 2]} plots onPlots={onPlots} />,
      },
      {
        kind: 'donut',
        make: (onPlots) => <DonutNanoChart data={[30, 70]} plots onPlots={onPlots} />,
      },
      {
        kind: 'gauge',
        make: (onPlots) => (
          <DonutNanoChart data={{ value: 3, max: 4 }} plots onPlots={onPlots} />
        ),
      },
      {
        kind: 'gauge',
        make: (onPlots) => (
          <GaugeNanoChart data={{ value: 3, max: 4 }} plots onPlots={onPlots} />
        ),
      },
      {
        kind: 'bullet',
        make: (onPlots) => (
          <BulletNanoChart
            data={{ value: 7, target: 8, ranges: [4, 6, 10] }}
            plots
            onPlots={onPlots}
          />
        ),
      },
      {
        kind: 'heatmap',
        make: (onPlots) => (
          <HeatmapNanoChart
            data={[
              [1, 2],
              [3, 4],
            ]}
            plots
            onPlots={onPlots}
          />
        ),
      },
      {
        kind: 'radar',
        make: (onPlots) => (
          <RadarNanoChart
            series={[
              { data: [4, 9, 2], name: 'alpha' },
              { data: [7, 3, 8], name: 'beta' },
            ]}
            plots
            onPlots={onPlots}
          />
        ),
      },
      {
        kind: 'pictogram',
        make: (onPlots) => <PictogramNanoChart data={[2, 3]} plots onPlots={onPlots} />,
      },
      {
        kind: 'winLoss',
        make: (onPlots) => <WinLossNanoChart data={[1, -1, 0]} plots onPlots={onPlots} />,
      },
    ];
    for (const { kind, make } of cases) {
      const onPlots = vi.fn();
      render(make(onPlots));
      expect(onPlots).toHaveBeenCalledTimes(1);
      expect((onPlots.mock.calls[0]![0] as { kind: string }).kind).toBe(kind);
    }
  });
});
