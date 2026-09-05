import type { BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';

export interface DonutGauge {
  value: number;
  max: number;
}

export type DonutInput<T = number> = DonutGauge | SeriesInput<T>;

export interface DonutOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>> {
  thickness?: number;
  startAngle?: number;
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
  const width = options.width ?? 20;
  const height = options.height ?? 20;
  const color = options.color ?? 'currentColor';
  const startAngle = options.startAngle ?? -90;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2;
  const thickness = options.thickness ?? rOuter * 0.35;
  const rMid = rOuter - thickness / 2;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  if (isGauge(data)) {
    const frac = data.max === 0 ? 0 : Math.max(0, Math.min(1, data.value / data.max));
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, startAngle, startAngle + 360),
      fill: 'none',
      stroke: color,
      strokeWidth: round(thickness),
      strokeOpacity: 0.15,
    });
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: arcPath(cx, cy, rMid, startAngle, startAngle + 360 * frac),
        fill: 'none',
        stroke: color,
        strokeWidth: round(thickness),
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
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      marks,
      points,
      a11y: {
        title: options.title ?? 'donut chart',
        desc: options.desc ?? `donut gauge, ${round(frac * 100)} percent of ${data.max}`,
      },
    };
  }

  const accessors = options.value
    ? { value: options.value, label: options.label, id: options.id }
    : undefined;
  const datums = normalizeSeries(data as SeriesInput<T>, accessors);
  const total = datums.reduce((sum, d) => sum + d.value, 0);
  const base: Scene = {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    marks,
    points,
    a11y: {
      title: options.title ?? 'donut chart',
      desc:
        options.desc ??
        (datums.length === 0 ? 'donut chart, no data' : `donut chart, ${datums.length} segments`),
    },
  };
  if (datums.length === 0 || total === 0) return base;

  let angle = startAngle;
  datums.forEach((d, i) => {
    const sweep = (d.value / total) * 360;
    marks.push({
      type: 'path',
      d: arcPath(cx, cy, rMid, angle, angle + sweep),
      fill: 'none',
      stroke: color,
      strokeWidth: round(thickness),
      strokeOpacity: i % 2 === 0 ? 1 : 0.55,
    });
    const [px, py] = polar(cx, cy, rMid, angle + sweep / 2);
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x: round(px), y: round(py) });
    angle += sweep;
  });

  return base;
}
