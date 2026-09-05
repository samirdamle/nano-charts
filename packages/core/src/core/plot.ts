import type { Padding } from '../types';
import { linearScale } from './geometry';

export interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function resolvePadding(p: Padding | undefined, def = 1): ResolvedPadding {
  if (p === undefined) return { top: def, right: def, bottom: def, left: def };
  if (typeof p === 'number') return { top: p, right: p, bottom: p, left: p };
  return { top: p.top ?? def, right: p.right ?? def, bottom: p.bottom ?? def, left: p.left ?? def };
}

export interface SeriesLayout {
  x: (index: number) => number;
  y: (value: number) => number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function seriesLayout(
  count: number,
  domain: [number, number],
  box: { width: number; height: number; padding: ResolvedPadding },
): SeriesLayout {
  const { width, height, padding } = box;
  const left = padding.left;
  const right = width - padding.right;
  const top = padding.top;
  const bottom = height - padding.bottom;
  const x =
    count <= 1 ? () => (left + right) / 2 : linearScale([0, count - 1], [left, right]);
  const y = linearScale(domain, [bottom, top]);
  return { x, y, left, right, top, bottom };
}
