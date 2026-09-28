import type { Mark } from '../types';
import { round } from './geometry';
import type { ResolvedPadding } from './plot';

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

/** Tick values plus the label formatter, resolved identically for rendering and measuring. */
export interface ResolvedAxisTicks {
  values: number[];
  format: (value: number) => string;
}

function snapTicks(values: number[], domain: [number, number], integerTicks?: boolean): number[] {
  let vs = values;
  if (integerTicks) {
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
}

/**
 * Resolves the tick values and label formatter for an axis. Shared by
 * `axisMarks` (rendering) and `axisSpace` (measuring) so the two can never drift.
 */
export function resolveAxisTicks(
  options: AxisOptions,
  domain: [number, number],
  integerTicks?: boolean,
): ResolvedAxisTicks {
  const tickCount = options.tickCount ?? 5;
  let step = 0;
  let values: number[] = [];
  if (options.ticks === true) {
    const n = niceTicks(domain, tickCount);
    step = n.step;
    values = n.ticks;
  } else if (Array.isArray(options.ticks)) {
    values = options.ticks.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  }
  values = snapTicks(values, domain, integerTicks);
  const format: (v: number) => string =
    typeof options.labels === 'function'
      ? options.labels
      : step > 0
        ? (() => {
            const d = decimalsFor(step);
            return (v: number) => v.toFixed(d);
          })()
        : (v: number) => String(round(v, 6));
  return { values, format };
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

  const { values: tickValues, format } = resolveAxisTicks(options, domain, layout.integerTicks);
  // Gridlines fall back to automatic ticks so `gridlines: { show: true }`
  // works without opting into tick marks.
  const gridValues = options.gridlines?.show
    ? tickValues.length > 0
      ? tickValues
      : resolveAxisTicks({ ...options, ticks: true }, domain, layout.integerTicks).values
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
  const pos = round(
    crossScale(Math.min(chi, Math.max(clo, Number.isFinite(posValue) ? posValue : 0))),
  );

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
          ? {
              type: 'line',
              x1: p,
              y1: round(q0),
              x2: p,
              y2: round(q1),
              stroke: gc,
              strokeWidth: gt,
              strokeDasharray,
              strokeLinecap,
            }
          : {
              type: 'line',
              x1: round(q0),
              y1: p,
              x2: round(q1),
              y2: p,
              stroke: gc,
              strokeWidth: gt,
              strokeDasharray,
              strokeLinecap,
            },
      );
    }
  }

  if (options.line !== false) {
    const [s0, s1] = span;
    axis.push(
      horizontal
        ? {
            type: 'line',
            x1: round(s0),
            y1: pos,
            x2: round(s1),
            y2: pos,
            stroke: color,
            strokeWidth: thickness,
          }
        : {
            type: 'line',
            x1: pos,
            y1: round(s0),
            x2: pos,
            y2: round(s1),
            stroke: color,
            strokeWidth: thickness,
          },
    );
  }

  // Ticks point outward, away from the plot interior.
  const mid = (crossSpan[0] + crossSpan[1]) / 2;
  const dir = pos >= mid ? 1 : -1;
  const showLabels = options.labels !== undefined && options.labels !== false;
  const fontSize = options.fontSize ?? 10;
  const labelColor = options.labelColor ?? color;
  for (const v of tickValues) {
    const p = round(scale(v));
    const t1 = round(pos + dir * tickSize);
    axis.push(
      horizontal
        ? {
            type: 'line',
            x1: p,
            y1: pos,
            x2: p,
            y2: t1,
            stroke: tickColor,
            strokeWidth: tickThickness,
          }
        : {
            type: 'line',
            x1: pos,
            y1: p,
            x2: t1,
            y2: p,
            stroke: tickColor,
            strokeWidth: tickThickness,
          },
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

/** Average glyph width as a fraction of font size, for label measurement without a DOM. */
const GLYPH_WIDTH_RATIO = 0.6;

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH_WIDTH_RATIO;
}

/**
 * Measures how many pixels an axis needs beyond each plot edge so nothing it
 * draws is clipped. Measures the marks `axisMarks` itself emits — axis line
 * and tick thickness, gridline edges, and label boxes — so the measurement
 * can never drift from the rendering. Returns zeros unless `options.show`.
 *
 * Charts call this on a probe layout (mark-extent padding only) *before*
 * the final layout, then fold the result into the real padding.
 */
export function axisSpace(options: AxisOptions | undefined, layout: AxisLayout): ResolvedPadding {
  const zero: ResolvedPadding = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!options?.show) return zero;
  const horizontal = layout.orientation === 'x';
  const [s0, s1] = layout.span;
  const [c0, c1] = layout.crossSpan;
  const plotLeft = horizontal ? Math.min(s0, s1) : Math.min(c0, c1);
  const plotRight = horizontal ? Math.max(s0, s1) : Math.max(c0, c1);
  const plotTop = horizontal ? Math.min(c0, c1) : Math.min(s0, s1);
  const plotBottom = horizontal ? Math.max(c0, c1) : Math.max(s0, s1);

  const space: ResolvedPadding = { ...zero };
  const eat = (x0: number, y0: number, x1: number, y1: number): void => {
    space.left = Math.max(space.left, plotLeft - Math.min(x0, x1));
    space.right = Math.max(space.right, Math.max(x0, x1) - plotRight);
    space.top = Math.max(space.top, plotTop - Math.min(y0, y1));
    space.bottom = Math.max(space.bottom, Math.max(y0, y1) - plotBottom);
  };

  const { grid, axis } = axisMarks(options, layout);
  const marks: Mark[] = [...grid, ...axis];
  for (const m of marks) {
    if (m.type === 'line') {
      // Stroke spreads half its width perpendicular to the line; along the
      // line it only extends past the endpoints with round/square caps
      // (butt is the default: the axis line ends exactly at the plot edge).
      const w = (m.strokeWidth ?? 1) / 2;
      const cap = m.strokeLinecap === 'round' || m.strokeLinecap === 'square' ? w : 0;
      if (m.y1 === m.y2) {
        eat(Math.min(m.x1, m.x2) - cap, m.y1 - w, Math.max(m.x1, m.x2) + cap, m.y1 + w);
      } else if (m.x1 === m.x2) {
        eat(m.x1 - w, Math.min(m.y1, m.y2) - cap, m.x1 + w, Math.max(m.y1, m.y2) + cap);
      } else {
        eat(m.x1 - w, m.y1 - w, m.x2 + w, m.y2 + w);
      }
    } else if (m.type === 'text') {
      const fs = m.fontSize ?? 10;
      const w = estimateTextWidth(m.text, fs);
      const anchor = m.textAnchor ?? 'start';
      const x0 = anchor === 'middle' ? m.x - w / 2 : anchor === 'end' ? m.x - w : m.x;
      eat(x0, m.y - fs * 0.8, x0 + w, m.y + fs * 0.2);
    }
  }
  return space;
}
