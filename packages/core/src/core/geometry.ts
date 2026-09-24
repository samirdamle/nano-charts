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
