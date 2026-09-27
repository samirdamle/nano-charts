import type { Mark } from '../types';
import { round } from './geometry';

/** Gridline stroke style. */
export type AxisGridlineStyle = 'solid' | 'dashed' | 'dotted';

export interface AxisGridlineOptions {
  /** Draw gridlines at each tick, spanning the plot. Defaults to `false`. */
  show?: boolean;
  /** Gridline color. Defaults to the axis color. */
  color?: string;
  /** Gridline thickness in px. Defaults to `1`. */
  thickness?: number;
  /** Gridline stroke style. Defaults to `'solid'`. */
  style?: AxisGridlineStyle;
}

export interface AxisOptions {
  /** Show this axis. Defaults to `false`. */
  show?: boolean;
  /** Draw the axis line. Set `false` for ticks-only. Defaults to `true`. */
  line?: boolean;
  /** Axis line color. Defaults to `'currentColor'`. */
  color?: string;
  /** Axis line thickness in px. Defaults to `1`. */
  thickness?: number;
  /** Tick marks: `true` for automatic nice ticks, an array of data values
   * for explicit ticks. Defaults to `false`. */
  ticks?: boolean | number[];
  /** Target tick count for automatic ticks. Defaults to `5`. */
  tickCount?: number;
  /** Tick mark length in px. Defaults to `4`. */
  tickSize?: number;
  /** Tick color. Defaults to the axis color. */
  tickColor?: string;
  /** Tick thickness in px. Defaults to the axis thickness. */
  tickThickness?: number;
  /** Tick labels: `true` for automatic formatting, a function for custom
   * labels. Defaults to `false`. */
  labels?: boolean | ((value: number) => string);
  /** Tick label color. Defaults to the axis color. */
  labelColor?: string;
  /** Tick label font size in px. Defaults to `10`. */
  fontSize?: number;
  /** Data value (in the perpendicular dimension) at which the axis line is
   * drawn, e.g. an x-axis at `y = 20`. Defaults to `0`, clamped to the
   * perpendicular domain. */
  position?: number;
  /** Gridlines at each tick, spanning the plot. */
  gridlines?: AxisGridlineOptions;
}

/** Everything a chart must supply to render one axis. */
export interface AxisLayout {
  /** `'x'` draws a horizontal line; `'y'` draws a vertical line. */
  orientation: 'x' | 'y';
  /** Data domain along the axis. */
  domain: [number, number];
  /** Maps an axis data value to px along the axis. */
  scale: (value: number) => number;
  /** Data domain perpendicular to the axis (positions the axis line). */
  crossDomain: [number, number];
  /** Maps a perpendicular data value to px. */
  crossScale: (value: number) => number;
  /** Pixel span the axis line covers. */
  span: [number, number];
  /** Pixel span gridlines cover, perpendicular to the axis. */
  crossSpan: [number, number];
  /** Snap automatic ticks to integers (category axes). */
  integerTicks?: boolean;
}

/** Nice-number tick values for a domain: 1/2/5 × 10^n steps covering it. */
export function niceTicks(domain: [number, number], count = 5): { ticks: number[]; step: number } {
  const [d0, d1] = domain;
  if (!(d1 > d0) || !Number.isFinite(d0) || !Number.isFinite(d1)) return { ticks: [], step: 0 };
  const span = d1 - d0;
  const rawStep = span / Math.max(1, Math.floor(count) || 1);
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(d0 / step - 1e-9) * step; v <= d1 + step * 1e-9; v += step) {
    const r = round(v);
    ticks.push(r === 0 ? 0 : r); // normalize -0
  }
  return { ticks, step };
}

/** Decimals needed to render a tick step exactly (0.5 → 1, 2 → 0). */
function decimalsFor(step: number): number {
  let d = 0;
  let s = step;
  while (d < 12 && Math.abs(s - Math.round(s)) > 1e-9) {
    s *= 10;
    d += 1;
  }
  return d;
}

function dashFor(style: AxisGridlineStyle | undefined): {
  strokeDasharray?: string;
  strokeLinecap?: 'round';
} {
  if (style === 'dashed') return { strokeDasharray: '5 4' };
  if (style === 'dotted') return { strokeDasharray: '0.1 4', strokeLinecap: 'round' };
  return {};
}

/**
 * Builds the marks for one axis: gridlines (drawn behind data) plus the
 * axis line, ticks, and labels (drawn in front). Returns empty arrays unless
 * `options.show` is set.
 */
export function axisMarks(
  options: AxisOptions | undefined,
  layout: AxisLayout,
): { grid: Mark[]; axis: Mark[] } {
  const none = { grid: [] as Mark[], axis: [] as Mark[] };
  if (!options?.show) return none;
  const { orientation, domain, scale, crossDomain, crossScale, span, crossSpan } = layout;
  const horizontal = orientation === 'x';

  const tickCount = options.tickCount ?? 5;
  let step = 0;
  let tickValues: number[] = [];
  if (options.ticks === true) {
    const n = niceTicks(domain, tickCount);
    step = n.step;
    tickValues = n.ticks;
  } else if (Array.isArray(options.ticks)) {
    tickValues = options.ticks.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  }
  const snap = (values: number[]): number[] => {
    let vs = values;
    if (layout.integerTicks) {
      const seen = new Set<number>();
      const ints: number[] = [];
      for (const v of vs) {
        const r = Math.round(v);
        if (!seen.has(r)) {
          seen.add(r);
          ints.push(r);
        }
      }
      vs = ints;
    }
    const lo = Math.min(domain[0], domain[1]);
    const hi = Math.max(domain[0], domain[1]);
    return vs.filter((v) => v >= lo - 1e-9 && v <= hi + 1e-9);
  };
  tickValues = snap(tickValues);
  // Gridlines fall back to automatic ticks so `gridlines: { show: true }`
  // works without opting into tick marks.
  const gridValues = options.gridlines?.show
    ? tickValues.length > 0
      ? tickValues
      : snap(niceTicks(domain, tickCount).ticks)
    : [];

  const thickness = options.thickness ?? 1;
  const color = options.color ?? 'currentColor';
  const tickColor = options.tickColor ?? color;
  const tickThickness = options.tickThickness ?? thickness;
  const tickSize = Math.max(0, options.tickSize ?? 4);

  // Axis line position in px; defaults to 0, clamped to the perpendicular domain.
  const clo = Math.min(crossDomain[0], crossDomain[1]);
  const chi = Math.max(crossDomain[0], crossDomain[1]);
  const posValue = options.position ?? 0;
  const pos = round(crossScale(Math.min(chi, Math.max(clo, Number.isFinite(posValue) ? posValue : 0))));

  const grid: Mark[] = [];
  const axis: Mark[] = [];

  if (gridValues.length > 0) {
    const g = options.gridlines!;
    const gc = g.color ?? color;
    const gt = g.thickness ?? 1;
    const { strokeDasharray, strokeLinecap } = dashFor(g.style);
    const [q0, q1] = crossSpan;
    for (const v of gridValues) {
      const p = round(scale(v));
      grid.push(
        horizontal
          ? { type: 'line', x1: p, y1: round(q0), x2: p, y2: round(q1), stroke: gc, strokeWidth: gt, strokeDasharray, strokeLinecap }
          : { type: 'line', x1: round(q0), y1: p, x2: round(q1), y2: p, stroke: gc, strokeWidth: gt, strokeDasharray, strokeLinecap },
      );
    }
  }

  if (options.line !== false) {
    const [s0, s1] = span;
    axis.push(
      horizontal
        ? { type: 'line', x1: round(s0), y1: pos, x2: round(s1), y2: pos, stroke: color, strokeWidth: thickness }
        : { type: 'line', x1: pos, y1: round(s0), x2: pos, y2: round(s1), stroke: color, strokeWidth: thickness },
    );
  }

  // Ticks point outward, away from the plot interior.
  const mid = (crossSpan[0] + crossSpan[1]) / 2;
  const dir = pos >= mid ? 1 : -1;
  const showLabels = options.labels !== undefined && options.labels !== false;
  const format: (v: number) => string =
    typeof options.labels === 'function'
      ? options.labels
      : step > 0
        ? (() => {
            const d = decimalsFor(step);
            return (v: number) => v.toFixed(d);
          })()
        : (v: number) => String(round(v, 6));
  const fontSize = options.fontSize ?? 10;
  const labelColor = options.labelColor ?? color;
  for (const v of tickValues) {
    const p = round(scale(v));
    const t1 = round(pos + dir * tickSize);
    axis.push(
      horizontal
        ? { type: 'line', x1: p, y1: pos, x2: p, y2: t1, stroke: tickColor, strokeWidth: tickThickness }
        : { type: 'line', x1: pos, y1: p, x2: t1, y2: p, stroke: tickColor, strokeWidth: tickThickness },
    );
    if (showLabels) {
      const text = format(v);
      axis.push(
        horizontal
          ? {
              type: 'text',
              x: p,
              y: round(t1 + (dir > 0 ? 4 + fontSize * 0.8 : -4)),
              text,
              fontSize,
              fill: labelColor,
              textAnchor: 'middle',
            }
          : {
              type: 'text',
              x: round(t1 + dir * 4),
              y: round(p + fontSize * 0.35),
              text,
              fontSize,
              fill: labelColor,
              textAnchor: dir > 0 ? 'start' : 'end',
            },
      );
    }
  }

  return { grid, axis };
}
