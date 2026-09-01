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

// Draw each arc as two half-sweeps so that even a full 360° ring has distinct
// intermediate endpoints — a single ~360° arc collapses (start == end after
// rounding) and SVG renders nothing.
function ringSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string {
  const midDeg = (startDeg + endDeg) / 2;
  const [ox1, oy1] = polar(cx, cy, rOuter, startDeg);
  const [oxm, oym] = polar(cx, cy, rOuter, midDeg);
  const [ox2, oy2] = polar(cx, cy, rOuter, endDeg);
  const [ix2, iy2] = polar(cx, cy, rInner, endDeg);
  const [ixm, iym] = polar(cx, cy, rInner, midDeg);
  const [ix1, iy1] = polar(cx, cy, rInner, startDeg);
  const ro = round(rOuter);
  const ri = round(rInner);
  return (
    `M${round(ox1)},${round(oy1)} ` +
    `A${ro},${ro} 0 0 1 ${round(oxm)},${round(oym)} ` +
    `A${ro},${ro} 0 0 1 ${round(ox2)},${round(oy2)} ` +
    `L${round(ix2)},${round(iy2)} ` +
    `A${ri},${ri} 0 0 0 ${round(ixm)},${round(iym)} ` +
    `A${ri},${ri} 0 0 0 ${round(ix1)},${round(iy1)} Z`
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
  const rInner = rOuter - thickness;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  if (isGauge(data)) {
    const frac = data.max === 0 ? 0 : Math.max(0, Math.min(1, data.value / data.max));
    marks.push({
      type: 'path',
      d: ringSegmentPath(cx, cy, rOuter, rInner, startAngle, startAngle + 360),
      fill: color,
      fillOpacity: 0.15,
    });
    if (frac > 0) {
      marks.push({
        type: 'path',
        d: ringSegmentPath(cx, cy, rOuter, rInner, startAngle, startAngle + 360 * frac),
        fill: color,
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
      d: ringSegmentPath(cx, cy, rOuter, rInner, angle, angle + sweep),
      fill: color,
      fillOpacity: i % 2 === 0 ? 1 : 0.55,
    });
    const [px, py] = polar(cx, cy, (rOuter + rInner) / 2, angle + sweep / 2);
    points.push({ id: d.id, label: d.label, value: d.value, index: i, x: round(px), y: round(py) });
    angle += sweep;
  });

  return base;
}
