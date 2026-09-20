import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
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
  /** Track ring opacity. Defaults to 0.15. */
  opacity?: number;
}

export interface DonutOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    Partial<SeriesColorAccessor<T>> {
  thickness?: number;
  startAngle?: number;
  /** Per-segment colors, index-matched to the input data. */
  colors?: string[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** Background ring behind the segments (the "100%" reference).
   * Gauge mode already draws one: the option customizes it, and
   * `track: false` hides it. Segmented mode gains it as an opt-in. */
  track?: boolean | DonutTrackOptions;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// Draw each ring segment as a stroked arc along its mid-radius (stroke-width
// gives the ring its thickness) rather than a filled outer+inner path — a
// segment then never carries both a fill and an inherited stroke.
// Split into two half-sweeps so that even a full 360° ring has distinct
// intermediate endpoints — a single ~360° arc collapses (start == end after
// rounding) and SVG renders nothing.
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const midDeg = (startDeg + endDeg) / 2;
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [xm, ym] = polar(cx, cy, r, midDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const rr = round(r);
  return (
    `M${round(x1)},${round(y1)} ` +
    `A${rr},${rr} 0 0 1 ${round(xm)},${round(ym)} ` +
    `A${rr},${rr} 0 0 1 ${round(x2)},${round(y2)}`
  );
}

function isGauge(data: unknown): data is DonutGauge {
  return !Array.isArray(data) && typeof data === 'object' && data !== null && 'max' in data;
}

export function donut<T = number>(data: DonutInput<T>, options: DonutOptions<T> = {}): Scene {
  // Donut defaults to a square 20x20 canvas; otherwise it shares the standard
  // chart shell (width/height/color/padding resolution).
  const { width, height, color } = resolveChartShell({ width: 20, height: 20, ...options });
  const startAngle = options.startAngle ?? -90;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2;
  const thickness = options.thickness ?? rOuter * 0.35;
  const rMid = rOuter - thickness / 2;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

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
        d: arcPath(cx, cy, rMid, startAngle, startAngle + 360),
        fill: 'none',
        stroke: t.color ?? color,
        strokeWidth: round(thickness),
        strokeOpacity: t.opacity ?? 0.15,
        ...strokeLinecap,
      });
    }
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: arcPath(cx, cy, rMid, startAngle, startAngle + 360 * frac),
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
      d: arcPath(cx, cy, rMid, startAngle, startAngle + 360),
      fill: 'none',
      stroke: segTrack.color ?? color,
      strokeWidth: round(thickness),
      strokeOpacity: segTrack.opacity ?? 0.15,
      ...strokeLinecap,
    });
  }

  // Precedence, shared with bar via resolveSegmentColor: explicit per-segment
  // color (field/accessor) > options.colors[i] > uniform options.color (only
  // if the caller passed it) > categorical palette.
  const hasUniformColor = options.color !== undefined;
  let angle = startAngle;
  datums.forEach((d, i) => {
    const sweep = (swept[i]! / total) * 360;
    const explicitColor = d.color ?? options.colors?.[i];
    const segmentColor = resolveSegmentColor({
      explicit: explicitColor,
      uniform: color,
      usePalette: !hasUniformColor,
      paletteIndex: i,
      paletteTotal: datums.length,
    });
    const useStripe = explicitColor === undefined && hasUniformColor;
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, angle, angle + sweep),
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

  return { ...base, marks, points };
}
