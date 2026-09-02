import { linearScale } from './geometry';

export type ColorScale = (value: number, ctx: { min: number; max: number }) => string;

export function parseColor(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]! + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lerpColor(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const c = a.map((av, i) => Math.round(av + (b[i]! - av) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const DEFAULT_SCALE: [string, string] = ['#f0f0f0', '#2563eb'];

export function makeColorScale(
  spec: [string, string] | ColorScale | undefined,
  domain: [number, number],
): ColorScale {
  if (typeof spec === 'function') return spec;
  const [from, to] = spec ?? DEFAULT_SCALE;
  const t = linearScale(domain, [0, 1]);
  return (value) => lerpColor(from, to, Math.max(0, Math.min(1, t(value))));
}
