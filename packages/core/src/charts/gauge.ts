import type { BaseOptions, CenterLabelContext, Mark, Scene, ScenePoint } from '../types';
import { arcPath, dialSpan, linearScale, polar, round } from '../core/geometry';
import { toFiniteNumber } from '../core/normalize';
import { resolveChartShell, sceneShell } from '../core/series-chart';
import type { DonutTrackOptions } from './donut';

export interface GaugeInput {
  value: number;
  max: number;
}

/** One colored band of the dial: spans from the previous zone's `to`
 * (or `min` for the first) up to `to`. */
export interface GaugeZone {
  to: number;
  color: string;
  /** Band opacity, 0–1. Useful for dimming the background dial so the value
   * arc (or needle) stands out. Defaults to 1. */
  opacity?: number;
}

export interface GaugeOptions extends BaseOptions {
  /** Domain minimum. Defaults to 0. */
  min?: number;
  /** 'arc': a foreground arc sweeps to the value. 'needle': a needle points
   * at the value over the dial. Defaults to 'arc'. */
  mode?: 'arc' | 'needle';
  /** Dial start in degrees (0° = east, clockwise positive). Defaults to 135. */
  startAngle?: number;
  /** Dial end in degrees. Defaults to startAngle + 270 (the classic gauge dial). */
  endAngle?: number;
  thickness?: number;
  /** Background dial behind the value arc (arc mode) or needle (needle mode
   * when no zones are given). Defaults to on; `false` hides it. */
  track?: boolean | DonutTrackOptions;
  /** Colored dial segments (e.g. green/yellow/red bands). In arc mode they
   * form the background the value arc sweeps over; in needle mode they are
   * the dial the needle points at. */
  zones?: GaugeZone[];
  /** Needle shape in needle mode. Defaults to 'triangle'. */
  needle?: 'line' | 'triangle';
  /** Needle (and hub) color. Defaults to the chart's color. */
  needleColor?: string;
  /** Text rendered at the dial's center: a literal string, or a formatter
   * receiving { value, min, max, frac }. Kept small relative to the dial's
   * inner hole so it never overlaps the dial ring. In needle mode it sits
   * just below center, clear of the hub. */
  centerLabel?: string | ((ctx: CenterLabelContext) => string);
  /** Line cap of the value arc, the track, and the zone bands, so the
   * background dial's ends always match the value arc's ends. (With 'round',
   * neighboring zone bands overlap slightly at their joints — the later band
   * paints over the earlier one.) */
  strokeLinecap?: 'butt' | 'round' | 'square';
}

export function gauge(data: GaugeInput, options: GaugeOptions = {}): Scene {
  // Gauge defaults to a square 20x20 canvas; otherwise it shares the standard
  // chart shell (width/height/color/padding resolution).
  const { width, height, color } = resolveChartShell({ width: 20, height: 20, ...options });
  const startAngle = options.startAngle ?? 135;
  // Clamp policy: a bad endAngle falls back to the classic 270° dial.
  const span = dialSpan(startAngle, options.endAngle, 270);
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2;
  const thickness = options.thickness ?? rOuter * 0.35;
  const rMid = rOuter - thickness / 2;
  const rInner = rOuter - thickness;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  const strokeLinecap =
    options.strokeLinecap !== undefined ? { strokeLinecap: options.strokeLinecap } : {};

  // Clamp policy: a bad domain pins the value at the bottom of the dial.
  const min = Number.isFinite(options.min) ? (options.min as number) : 0;
  const value = toFiniteNumber(data.value);
  const validDomain = Number.isFinite(data.max) && data.max > min;
  const max = validDomain ? (data.max as number) : min + 1;
  const frac = !validDomain ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const valueAngle = startAngle + frac * span;
  const valueToAngle = linearScale([min, max], [startAngle, startAngle + span]);

  const mode = options.mode === 'needle' ? 'needle' : 'arc';

  // Dial background: zone bands when given (both modes), else the track ring.
  const zones = options.zones ?? [];
  if (zones.length > 0) {
    let prevTo = min;
    for (const zone of zones) {
      const z0 = Math.max(min, prevTo);
      const z1 = Math.min(max, toFiniteNumber(zone.to));
      prevTo = z1;
      if (z1 > z0) {
        marks.push({
          type: 'path',
          d: arcPath(cx, cy, rMid, valueToAngle(z0), valueToAngle(z1)),
          fill: 'none',
          stroke: zone.color,
          strokeWidth: round(thickness),
          ...(zone.opacity !== undefined ? { strokeOpacity: zone.opacity } : {}),
          ...strokeLinecap,
        });
      }
    }
  } else if (options.track !== false) {
    const t: DonutTrackOptions =
      options.track === true || options.track === undefined ? {} : options.track;
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, startAngle, startAngle + span),
      fill: 'none',
      stroke: t.color ?? color,
      strokeWidth: round(thickness),
      strokeOpacity: t.opacity ?? 0.25,
      ...strokeLinecap,
    });
  }

  const needleColor = options.needleColor ?? color;

  if (mode === 'arc') {
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: arcPath(cx, cy, rMid, startAngle, valueAngle),
        fill: 'none',
        stroke: color,
        strokeWidth: round(thickness),
        ...strokeLinecap,
      });
    }
  } else {
    const [tipX, tipY] = polar(cx, cy, rMid, valueAngle);
    if (options.needle === 'line') {
      // Thin needle from the pivot center to the tip. The hub dot drawn
      // below covers the joint, so nothing juts out the other side.
      marks.push({
        type: 'line',
        x1: round(cx),
        y1: round(cy),
        x2: round(tipX),
        y2: round(tipY),
        stroke: needleColor,
        strokeWidth: Math.max(1, round(thickness * 0.35)),
      });
    } else {
      // Tapered triangle: tip at the dial, base straddling the pivot.
      const hw = thickness * 0.28;
      const [b1x, b1y] = polar(cx, cy, hw, valueAngle + 90);
      const [b2x, b2y] = polar(cx, cy, hw, valueAngle - 90);
      marks.push({
        type: 'path',
        d: `M${round(tipX)},${round(tipY)}L${round(b1x)},${round(b1y)}L${round(b2x)},${round(b2y)}Z`,
        fill: needleColor,
        stroke: 'none',
      });
    }
    // Hub dot covering the needle's pivot.
    marks.push({
      type: 'circle',
      cx: round(cx),
      cy: round(cy),
      r: Math.max(1, round(thickness * 0.3)),
      fill: needleColor,
    });
  }

  if (options.centerLabel !== undefined) {
    const label =
      typeof options.centerLabel === 'function'
        ? options.centerLabel({ value, min, max, frac })
        : options.centerLabel;
    // Half the previous label size: the text stays inside the dial's hole
    // and can never overlap the dial ring, in either mode.
    const fontSize = Math.max(2, Math.round(rInner * 0.425));
    // Arc mode: dead center. Needle mode: just below center, clear of the hub
    // (the classic digital-readout position).
    const ly = mode === 'needle' ? cy + rOuter * 0.45 + fontSize * 0.35 : cy + fontSize * 0.35;
    marks.push({
      type: 'text',
      x: round(cx),
      y: round(ly),
      text: label,
      fontSize,
      fontWeight: 600,
      textAnchor: 'middle',
    });
  }

  points.push({
    id: 0,
    label: `${round(frac * 100)}%`,
    value,
    index: 0,
    x: round(cx),
    y: round(cy),
  });

  return {
    ...sceneShell(
      { width, height },
      {
        title: options.title ?? 'gauge chart',
        desc: options.desc ?? `gauge, ${round(frac * 100)} percent of ${min} to ${max}`,
      },
    ),
    marks,
    points,
  };
}
