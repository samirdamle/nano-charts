import type { BaseOptions, CenterLabelContext, Mark, Scene, ScenePoint } from '../types';
import { arcPath, dialSpan, polar, round } from '../core/geometry';
import {
  normalizeSeries,
  type SeriesAccessors,
  type SeriesColorAccessor,
  type SeriesInput,
} from '../core/normalize';
import { resolveSegmentColor } from '../core/palette';
import { resolveChartShell, sceneShell } from '../core/series-chart';

export interface DonutGauge {
  value: number;
  max: number;
}

export type DonutInput<T = number> = DonutGauge | SeriesInput<T>;

export interface DonutTrackOptions {
  /** Track ring stroke. Defaults to the chart's base color. */
  color?: string;
  /** Track ring opacity. Defaults to 0.25. */
  opacity?: number;
}

export interface DonutOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    Partial<SeriesColorAccessor<T>> {
  thickness?: number;
  startAngle?: number;
  /** End of the dial's angle domain in degrees (same convention as startAngle:
   * 0° = east, clockwise positive). Defaults to startAngle + 360 (full circle).
   * A smaller span turns the donut into a partial dial, e.g. 135 → 405. */
  endAngle?: number;
  /** Per-segment colors, index-matched to the input data. */
  colors?: string[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** Background ring behind the segments (the "100%" reference).
   * Gauge mode already draws one: the option customizes it, and
   * `track: false` hides it. Segmented mode gains it as an opt-in. */
  track?: boolean | DonutTrackOptions;
  /** Gap between adjacent segments in segmented mode, in user units (same
   * units as `thickness`). Each segment is inset by half the gap on both
   * ends, so the wrap seam at `startAngle` is gapped too. Defaults to 0.2
   * (about 1px at typical display sizes);
   * `0` renders touching segments. Ignored in gauge mode. */
  gap?: number;
  /** Text rendered at the dial's center: a literal string, or a formatter
   * receiving the value context. Gauge mode passes
   * { value, min: 0, max, frac }; segmented mode passes
   * { value: total, min: 0, max: total, frac: 1 }. */
  centerLabel?: string | ((ctx: CenterLabelContext) => string);
}

function isGauge(data: unknown): data is DonutGauge {
  return !Array.isArray(data) && typeof data === 'object' && data !== null && 'max' in data;
}

export function donut<T = number>(data: DonutInput<T>, options: DonutOptions<T> = {}): Scene {
  // Donut defaults to a square 20x20 canvas; otherwise it shares the standard
  // chart shell (width/height/color/padding resolution).
  const { width, height, color } = resolveChartShell({ width: 20, height: 20, ...options });
  const startAngle = options.startAngle ?? -90;
  // The dial spans [startAngle, endAngle]; default is the full circle.
  // Clamp policy: a bad endAngle falls back to the full 360° span.
  const span = dialSpan(startAngle, options.endAngle, 360);
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2;
  const thickness = options.thickness ?? rOuter * 0.35;
  const rMid = rOuter - thickness / 2;
  const rInner = rOuter - thickness;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  // Segment gaps (segmented mode only): each segment is inset by half the
  // gap on both ends, so every adjacency — including the wrap seam at
  // startAngle — gets the same spacing. Clamp policy: a non-finite gap
  // falls back to the default, a negative gap behaves as 0.
  const gapRaw = options.gap ?? 0.2;
  const gap = Number.isFinite(gapRaw) ? Math.max(0, gapRaw) : 0.2;
  const halfGapDeg = gap === 0 ? 0 : ((gap / 2) / rMid) * (180 / Math.PI);

  // Center readout: font sized to the dial's hole, baseline nudged so the
  // text reads as vertically centered. No fill: inherits currentColor.
  const pushCenterLabel = (ctx: CenterLabelContext) => {
    const label =
      typeof options.centerLabel === 'function' ? options.centerLabel(ctx) : options.centerLabel;
    if (label === undefined) return;
    // Half the previous label size, semibold: the readout sits inside the
    // dial's hole and never overlaps the dial ring.
    const fontSize = Math.max(2, Math.round(rInner * 0.425));
    marks.push({
      type: 'text',
      x: round(cx),
      y: round(cy + fontSize * 0.35),
      text: label,
      fontSize,
      fontWeight: 600,
      textAnchor: 'middle',
    });
  };

  const strokeLinecap =
    options.strokeLinecap !== undefined ? { strokeLinecap: options.strokeLinecap } : {};

  const trackOpt = options.track;

  if (isGauge(data)) {
    const frac = data.max === 0 ? 0 : Math.max(0, Math.min(1, data.value / data.max));
    // The background ring predates the track option: it stays on by default
    // (unchanged rendering), the option customizes it, `false` hides it.
    if (trackOpt !== false) {
      const t: DonutTrackOptions = trackOpt === true || trackOpt === undefined ? {} : trackOpt;
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
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: arcPath(cx, cy, rMid, startAngle, startAngle + span * frac),
        fill: 'none',
        stroke: color,
        strokeWidth: round(thickness),
        ...strokeLinecap,
      });
    }
    points.push({
      id: 0,
      label: `${round(frac * 100)}%`,
      value: data.value,
      index: 0,
      x: round(cx),
      y: round(cy),
    });
    pushCenterLabel({ value: data.value, min: 0, max: data.max, frac });
    return {
      ...sceneShell(
        { width, height },
        {
          title: options.title ?? 'donut chart',
          desc: options.desc ?? `donut gauge, ${round(frac * 100)} percent of ${data.max}`,
        },
      ),
      marks,
      points,
    };
  }

  const accessors = options.value
    ? {
        value: options.value,
        label: options.label,
        id: options.id,
        colorAccessor: options.colorAccessor,
      }
    : undefined;
  const datums = normalizeSeries(data as SeriesInput<T>, accessors);
  // Clamp policy: donut segments are fractions of a whole, so negative
  // values can't produce negative sweeps — they're treated as zero for the
  // sweep math. Points keep the raw values (datum identity for tooltips).
  const swept = datums.map((d) => Math.max(0, d.value));
  const total = swept.reduce((sum, v) => sum + v, 0);
  const base = sceneShell(
    { width, height },
    {
      title: options.title ?? 'donut chart',
      desc:
        options.desc ??
        (datums.length === 0 ? 'donut chart, no data' : `donut chart, ${datums.length} segments`),
    },
  );
  if (datums.length === 0 || total === 0) return base;

  // Opt-in track ring behind the segments: same radii and thickness as the
  // segments, so it reads as the "100%" reference. Decorative: no points.
  const segTrack: DonutTrackOptions | undefined = trackOpt === true ? {} : trackOpt || undefined;
  if (segTrack) {
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, startAngle, startAngle + span),
      fill: 'none',
      stroke: segTrack.color ?? color,
      strokeWidth: round(thickness),
      strokeOpacity: segTrack.opacity ?? 0.25,
      ...strokeLinecap,
    });
  }

  // Precedence, shared with bar via resolveSegmentColor: explicit per-segment
  // color (field/accessor) > options.colors[i] > uniform options.color (only
  // if the caller passed it) > categorical palette.
  const hasUniformColor = options.color !== undefined;
  let angle = startAngle;
  datums.forEach((d, i) => {
    const sweep = (swept[i]! / total) * span;
    const explicitColor = d.color ?? options.colors?.[i];
    const segmentColor = resolveSegmentColor({
      explicit: explicitColor,
      uniform: color,
      usePalette: !hasUniformColor,
      paletteIndex: i,
      paletteTotal: datums.length,
    });
    const useStripe = explicitColor === undefined && hasUniformColor;
    // Inset both ends by half the gap; a segment narrower than the full gap
    // collapses to a zero-length arc rather than inverting.
    const segStart = angle + halfGapDeg;
    const segEnd = Math.max(angle + sweep - halfGapDeg, segStart);
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, segStart, segEnd),
      fill: 'none',
      stroke: segmentColor,
      strokeWidth: round(thickness),
      strokeOpacity: useStripe ? (i % 2 === 0 ? 1 : 0.55) : 1,
      ...strokeLinecap,
    });
    const [px, py] = polar(cx, cy, rMid, angle + sweep / 2);
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x: round(px), y: round(py) });
    angle += sweep;
  });
  pushCenterLabel({ value: total, min: 0, max: total, frac: 1 });

  return { ...base, marks, points };
}
