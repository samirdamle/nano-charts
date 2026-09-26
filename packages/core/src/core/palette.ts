import { round } from './geometry';

export function categoricalColor(index: number, total: number): string {
  const hue = round((index * 360) / total);
  const lightness = index % 2 === 0 ? 30 : 70;
  return `hsl(${hue}, 60%, ${lightness}%)`;
}

/**
 * Pastel block palette, from the original chalk demo theme: light fills that
 * read well as countable unit blocks. Cycles when there are more categories
 * than colors.
 */
const PASTELS = ['#8fe6c4', '#f3a8c7', '#7fd8e6', '#c6a6e8', '#f0dd82'];

export function pastelColor(index: number): string {
  return PASTELS[((index % PASTELS.length) + PASTELS.length) % PASTELS.length]!;
}

export interface SegmentColorSpec {
  /** Explicit per-segment color (datum field or accessor) — always wins. */
  explicit?: string;
  /** The chart's uniform `options.color`. */
  uniform: string;
  /** Whether to fall back to the palette instead of the uniform color. */
  usePalette: boolean;
  /** Index/total for the palette fallback. */
  paletteIndex: number;
  paletteTotal: number;
  /** Palette function override; defaults to `categoricalColor`. */
  palette?: (index: number, total: number) => string;
}

/**
 * Shared segment-color precedence for bar and donut: an explicit per-segment
 * color wins; otherwise the palette or the uniform color applies,
 * per the chart's `usePalette` decision.
 */
export function resolveSegmentColor(spec: SegmentColorSpec): string {
  const palette = spec.palette ?? categoricalColor;
  return (
    spec.explicit ??
    (spec.usePalette ? palette(spec.paletteIndex, spec.paletteTotal) : spec.uniform)
  );
}
