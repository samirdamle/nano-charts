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
