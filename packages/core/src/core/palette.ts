import { round } from './geometry';

export function categoricalColor(index: number, total: number): string {
  const hue = round((index * 360) / total);
  const lightness = index % 2 === 0 ? 30 : 70;
  return `hsl(${hue}, 60%, ${lightness}%)`;
}

export interface SegmentColorSpec {
  /** Explicit per-segment color (datum field or accessor) — always wins. */
  explicit?: string;
  /** The chart's uniform `options.color`. */
  uniform: string;
  /** Whether to fall back to the categorical palette instead of the uniform color. */
  usePalette: boolean;
  /** Index/total for the categorical palette fallback. */
  paletteIndex: number;
  paletteTotal: number;
}

/**
 * Shared segment-color precedence for bar and donut: an explicit per-segment
 * color wins; otherwise the categorical palette or the uniform color applies,
 * per the chart's `usePalette` decision.
 */
export function resolveSegmentColor(spec: SegmentColorSpec): string {
  return (
    spec.explicit ??
    (spec.usePalette
      ? categoricalColor(spec.paletteIndex, spec.paletteTotal)
      : spec.uniform)
  );
}
