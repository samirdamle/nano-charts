import type { AnnotationOptions, BaseOptions, CenterLabelContext, Mark, Scene, ScenePoint } from '../types';
import { arcPath, dialSpan, polar, round } from '../core/geometry';
import {
  normalizeSeries,
  toFiniteNumber,
  type SeriesAccessors,
  type SeriesColorAccessor,
  type SeriesInput,
} from '../core/normalize';
import { resolveSegmentColor } from '../core/palette';
import { resolveChartShell, sceneShell } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import { annotationMarks, dialAnnotationMapper } from '../core/annotations';
import { gauge, pushCenterLabel } from './gauge';

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
    Partial<SeriesColorAccessor<T>>,
    AnnotationOptions {
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


  const trackOpt = options.track;

  if (isGauge(data)) {
    // Gauge input is a 2-arc dial: delegate to the standalone gauge chart
    // (issue #22) instead of maintaining a parallel implementation here.
    // The overrides below preserve donut's historical gauge contract —
    // full-circle dial by default, background track on by default, and
    // donut-flavored a11y — while everything else (including the
    // width/height/color defaults) flows through untouched, so only the
    // scene-building is shared.
    const validMax = Number.isFinite(data.max) && data.max > 0;
    const frac = !validMax ? 0 : Math.max(0, Math.min(1, toFiniteNumber(data.value) / data.max));
    return gauge(
      { value: data.value, max: data.max },
      {
        ...options,
        mode: 'arc',
        min: 0,
        startAngle,
        endAngle: startAngle + span,
        title: options.title ?? 'donut chart',
        desc: options.desc ?? `donut gauge, ${round(frac * 100)} percent of ${data.max}`,
      },
    );
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
    options,
  );
  if (datums.length === 0 || total === 0) return base;

  // Opt-in track ring behind the segments: same radii and thickness as the
  // segments, so it reads as the "100%" reference. Decorative: no points.
  const segTrack: DonutTrackOptions | undefined = trackOpt === true ? {} : trackOpt || undefined;
  if (segTrack) {
    marks.push({
      type: 'path',
      class: markClass('track'),
      d: arcPath(cx, cy, rMid, startAngle, startAngle + span),
      fill: 'none',
      stroke: segTrack.color ?? color,
      strokeWidth: round(thickness),
      strokeOpacity: segTrack.opacity ?? 0.25,
      strokeLinecap: options.strokeLinecap,
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
      class: markClass('segment', i),
      d: arcPath(cx, cy, rMid, segStart, segEnd),
      fill: 'none',
      stroke: segmentColor,
      strokeWidth: round(thickness),
      strokeOpacity: useStripe ? (i % 2 === 0 ? 1 : 0.55) : 1,
      strokeLinecap: options.strokeLinecap,
    });
    const [px, py] = polar(cx, cy, rMid, angle + sweep / 2);
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x: round(px), y: round(py) });
    angle += sweep;
  });
  pushCenterLabel(marks, options.centerLabel, { value: total, min: 0, max: total, frac: 1 }, cx, cy, rInner);
  // Annotations sit on top of everything, on the ring at mid-thickness
  // radius; `y` is the value across [0, total] (x is ignored). Gauge mode
  // needs nothing here: it delegates to gauge(), which applies the same
  // mapping with [0, max] and these same startAngle/span values.
  marks.push(
    ...annotationMarks(
      options.annotations,
      dialAnnotationMapper(cx, cy, rMid, startAngle, span, [0, total]),
      color,
    ),
  );

  return { ...base, marks, points };
}
