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

export interface PaddedBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function paddedBox(box: { width: number; height: number; padding: ResolvedPadding }): PaddedBox {
  const { width, height, padding } = box;
  return {
    left: padding.left,
    right: width - padding.right,
    top: padding.top,
    bottom: height - padding.bottom,
  };
}

export interface SeriesLayout extends PaddedBox {
  x: (index: number) => number;
  y: (value: number) => number;
}

export function seriesLayout(
  count: number,
  domain: [number, number],
  box: { width: number; height: number; padding: ResolvedPadding },
): SeriesLayout {
  const { left, right, top, bottom } = paddedBox(box);
  const x =
    count <= 1 ? () => (left + right) / 2 : linearScale([0, count - 1], [left, right]);
  const y = linearScale(domain, [bottom, top]);
  return { x, y, left, right, top, bottom };
}

export interface SlotLayout {
  slot: number;
  barWidth: number;
  x: (index: number) => number;
}

export function slotLayout(count: number, left: number, right: number, gap: number): SlotLayout {
  const slot = (right - left) / count;
  const barWidth = slot * (1 - gap);
  return { slot, barWidth, x: (index) => left + index * slot + (slot - barWidth) / 2 };
}
