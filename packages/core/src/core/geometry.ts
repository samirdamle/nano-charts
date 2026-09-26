export function round(n: number, precision = 2): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

export function toDasharray(d: string | number[] | undefined): string | undefined {
  return Array.isArray(d) ? d.join(' ') : d;
}

export function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

export function linearScale(
  domain: [number, number],
  range: [number, number],
): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  const m = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}

/** Validate a dial's angle span in degrees: falls back to `fallback` when
 * endAngle is missing, non-finite, or not ahead of startAngle; caps at one
 * full turn. */
export function dialSpan(
  startAngle: number,
  endAngle: number | undefined,
  fallback: number,
): number {
  const raw = (endAngle ?? startAngle + fallback) - startAngle;
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 360) : fallback;
}

/** Point on a circle: 0° = east, clockwise positive (SVG y-down). */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// Draw an arc as a stroked path along its radius (stroke-width gives the
// stroke its thickness) rather than a filled outer+inner path — the arc then
// never carries both a fill and an inherited stroke.
// Split into two half-sweeps so that even a full 360° ring has distinct
// intermediate endpoints — a single ~360° arc collapses (start == end after
// rounding) and SVG renders nothing.
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
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

/**
 * Builds an SVG path `d` for a smooth curve through the points, using a
 * Catmull-Rom spline emitted as cubic Bézier segments. The curve passes
 * through every point; the endpoints are duplicated so the spline starts
 * and ends exactly on the first/last point. Returns '' for < 2 points.
 */
export function splinePath(points: [number, number][]): string {
  if (points.length < 2) return '';
  const at = (i: number): [number, number] =>
    points[Math.min(Math.max(i, 0), points.length - 1)]!;
  const [sx, sy] = at(0);
  let d = `M${sx},${sy}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1x = round(x1 + (x2 - x0) / 6);
    const c1y = round(y1 + (y2 - y0) / 6);
    const c2x = round(x2 - (x3 - x1) / 6);
    const c2y = round(y2 - (y3 - y1) / 6);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  }
  return d;
}
