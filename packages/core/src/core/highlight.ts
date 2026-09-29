import type { Mark } from '../types';
import { round } from './geometry';

/**
 * A highlighted background region, expressed in the chart's data
 * coordinates — the same coordinates the axis ticks use: x is index-based
 * for line/area/lines/bar (bar centers) and heatmap (cell centers), and
 * value-based for scatter; y is value-based everywhere except heatmap
 * (row centers). Omit `x` for a full-width band, `y` for a full-height
 * band, both for a full-plot wash.
 */
export interface HighlightZone {
  /** Data range on the x scale. Defaults to the full plot width. */
  x?: [number, number];
  /** Data range on the y scale. Defaults to the full plot height. */
  y?: [number, number];
  /** Fill color. Any CSS color; use rgba()/hsla() for translucency. */
  color: string;
}

/** One zone or several. */
export type HighlightOption = HighlightZone | HighlightZone[];

/**
 * Turns highlight zones into background rect marks. Ranges are mapped
 * through the chart's scales and clipped to the plot box, so zones are
 * purely decorative: they never affect automatic padding and never
 * draw outside the plot.
 */
export function highlightMarks(
  zones: HighlightOption | undefined,
  scales: { x: (v: number) => number; y: (v: number) => number },
  box: { left: number; top: number; right: number; bottom: number },
): Mark[] {
  if (zones === undefined) return [];
  const list = Array.isArray(zones) ? zones : [zones];
  const marks: Mark[] = [];
  for (const z of list) {
    let x0 = box.left;
    let x1 = box.right;
    if (z.x !== undefined) {
      const a = scales.x(Math.min(z.x[0], z.x[1]));
      const b = scales.x(Math.max(z.x[0], z.x[1]));
      x0 = Math.min(a, b);
      x1 = Math.max(a, b);
    }
    let y0 = box.top;
    let y1 = box.bottom;
    if (z.y !== undefined) {
      const a = scales.y(Math.min(z.y[0], z.y[1]));
      const b = scales.y(Math.max(z.y[0], z.y[1]));
      y0 = Math.min(a, b);
      y1 = Math.max(a, b);
    }
    // Clip to the plot box; skip zones that fall entirely outside it.
    const x = Math.max(x0, box.left);
    const y = Math.max(y0, box.top);
    const w = Math.min(x1, box.right) - x;
    const h = Math.min(y1, box.bottom) - y;
    if (w <= 0 || h <= 0) continue;
    marks.push({
      type: 'rect',
      x: round(x),
      y: round(y),
      width: round(w),
      height: round(h),
      fill: z.color,
    });
  }
  return marks;
}
