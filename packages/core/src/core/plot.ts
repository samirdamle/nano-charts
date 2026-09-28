import type { Padding } from '../types';
import { linearScale } from './geometry';

export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function resolvePadding(p: Padding | undefined, def = 1): ResolvedPadding {
  if (p === undefined) return { top: def, right: def, bottom: def, left: def };
  if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
  return { top: p.top ?? def, right: p.right ?? def, bottom: p.bottom ?? def, left: p.left ?? def };
}

/** Round up to 1 decimal: no clipping, no waste. */
function ceil1(v: number): number {
  return Math.ceil(v * 10 - 1e-9) / 10 || 0;
}

/**
 * Smallest padding that keeps every mark and axis label inside the chart:
 * per side, the max of the mark half-extent (so an edge mark is never
 * clipped) and the measured axis overflow. Zero when there is nothing to
 * protect — the plot then fills the chart edge to edge.
 */
export function autoPadding(
  markExtent: number,
  xSpace?: ResolvedPadding,
  ySpace?: ResolvedPadding,
): ResolvedPadding {
  const m = Math.max(0, markExtent);
  const side = (a?: number, b?: number) => ceil1(Math.max(m, a ?? 0, b ?? 0));
  return {
    top: side(xSpace?.top, ySpace?.top),
    right: side(xSpace?.right, ySpace?.right),
    bottom: side(xSpace?.bottom, ySpace?.bottom),
    left: side(xSpace?.left, ySpace?.left),
  };
}

/**
 * Keeps automatic padding from collapsing the plot: on a chart too small for
 * the measured padding, shrink each axis pair proportionally so at least 1px
 * of plot survives (a fully-eaten plot inverts the box and flips the chart).
 * Some clipping is then unavoidable, but the chart stays oriented.
 * Explicit user padding is never shrunk — it remains the escape hatch.
 */
export function fitAutoPadding(
  padding: ResolvedPadding,
  width: number,
  height: number,
): ResolvedPadding {
  const vTotal = padding.top + padding.bottom;
  const hTotal = padding.left + padding.right;
  const vScale = vTotal >= height && vTotal > 0 ? Math.max(0, (height - 1) / vTotal) : 1;
  const hScale = hTotal >= width && hTotal > 0 ? Math.max(0, (width - 1) / hTotal) : 1;
  if (vScale === 1 && hScale === 1) return padding;
  const scale = (v: number, s: number) => Math.max(0, v * s);
  return {
    top: scale(padding.top, vScale),
    right: scale(padding.right, hScale),
    bottom: scale(padding.bottom, vScale),
    left: scale(padding.left, hScale),
  };
}

/** Per-side maximum of two paddings. */
export function maxPadding(a: ResolvedPadding, b: ResolvedPadding): ResolvedPadding {
  return {
    top: Math.max(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
    left: Math.max(a.left, b.left),
  };
}

function paddingClose(a: ResolvedPadding, b: ResolvedPadding): boolean {
  return (
    Math.abs(a.top - b.top) < 1e-9 &&
    Math.abs(a.right - b.right) < 1e-9 &&
    Math.abs(a.bottom - b.bottom) < 1e-9 &&
    Math.abs(a.left - b.left) < 1e-9
  );
}

/**
 * Automatic plot padding, iterated to a fixed point.
 *
 * `measure` builds the chart's layout for a candidate padding and returns the
 * axis overflow measured on it. The first pass probes at mark extent only;
 * each following pass re-measures on the resulting layout and grows any side
 * the probe underestimated. The extra passes only change the result when an
 * axis anchor moves with the plot size (bar axes sit on bar centers, which
 * shift as padding shrinks the plot); anchors rigidly tied to the plot edges
 * measure identically on every pass, so those charts settle after a single
 * measurement — the same work as a one-shot probe.
 *
 * Fully explicit padding skips measuring entirely: the caller takes
 * responsibility for it. Partial explicit padding still gets automatic values
 * on the sides the caller left unset.
 */
export function autoPlotPadding(
  explicit: Padding | undefined,
  markExtent: number,
  width: number,
  height: number,
  measure: (padding: ResolvedPadding) => { x: ResolvedPadding; y: ResolvedPadding },
): ResolvedPadding {
  if (typeof explicit === 'number') {
    return { top: explicit, right: explicit, bottom: explicit, left: explicit };
  }
  if (
    explicit?.top !== undefined &&
    explicit?.right !== undefined &&
    explicit?.bottom !== undefined &&
    explicit?.left !== undefined
  ) {
    return {
      top: explicit.top,
      right: explicit.right,
      bottom: explicit.bottom,
      left: explicit.left,
    };
  }
  let auto = fitAutoPadding(autoPadding(markExtent), width, height);
  for (let i = 0; i < 10; i++) {
    const s = measure(auto);
    const next = fitAutoPadding(maxPadding(auto, autoPadding(markExtent, s.x, s.y)), width, height);
    if (paddingClose(next, auto)) {
      auto = next;
      break;
    }
    auto = next;
  }
  return resolveAutoPadding(explicit, auto);
}

/**
 * Final padding for a chart: an explicit `padding` option wins per side;
 * sides the caller left unset fall back to the auto computation (not a flat
 * default), so e.g. `padding: { bottom: 20 }` still gets minimal
 * anti-clipping padding everywhere else.
 */
export function resolveAutoPadding(
  explicit: Padding | undefined,
  auto: ResolvedPadding,
): ResolvedPadding {
  if (explicit === undefined) return auto;
  if (typeof explicit === 'number') {
    return { top: explicit, right: explicit, bottom: explicit, left: explicit };
  }
  return {
    top: explicit.top ?? auto.top,
    right: explicit.right ?? auto.right,
    bottom: explicit.bottom ?? auto.bottom,
    left: explicit.left ?? auto.left,
  };
}

export interface PaddedBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function paddedBox(box: {
  width: number;
  height: number;
  padding: ResolvedPadding;
}): PaddedBox {
  const { width, height, padding } = box;
  return {
    left: padding.left,
    right: width - padding.right,
    top: padding.top,
    bottom: height - padding.bottom,
  };
}

export interface SeriesLayout extends PaddedBox {
  x: (index: number) => number;
  y: (value: number) => number;
}

export function seriesLayout(
  count: number,
  domain: [number, number],
  box: { width: number; height: number; padding: ResolvedPadding },
): SeriesLayout {
  const { left, right, top, bottom } = paddedBox(box);
  const x = count <= 1 ? () => (left + right) / 2 : linearScale([0, count - 1], [left, right]);
  const y = linearScale(domain, [bottom, top]);
  return { x, y, left, right, top, bottom };
}

export interface SlotLayout {
  slot: number;
  barWidth: number;
  x: (index: number) => number;
}

export function slotLayout(count: number, left: number, right: number, gap: number): SlotLayout {
  const slot = (right - left) / count;
  const barWidth = slot * (1 - gap);
  return { slot, barWidth, x: (index) => left + index * slot + (slot - barWidth) / 2 };
}
