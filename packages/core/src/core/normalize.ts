import type { Datum } from '../types';

export type ValueAccessor<T> = (row: T, index: number) => number;
export type LabelAccessor<T> = (row: T, index: number) => string;
export type IdAccessor<T> = (row: T, index: number) => string | number;
export type ColorAccessor<T> = (row: T, index: number) => string;

export interface SeriesAccessors<T> {
  value: ValueAccessor<T>;
  label?: LabelAccessor<T>;
  id?: IdAccessor<T>;
}

// Kept separate from `SeriesAccessors<T>` (not merged in) so charts that
// don't support per-row color yet (bar, line, area, win-loss, lines) don't
// silently accept a `colorAccessor` option they'd ignore — only chart option
// types that explicitly extend this too (currently just `DonutOptions`) can
// take one. See ADR 0003 "Corrected during implementation".
export interface SeriesColorAccessor<T> {
  colorAccessor?: ColorAccessor<T>;
}

// `color` lives directly on the shared `ObjectPoint`/`SeriesInput<T>`
// (unlike `colorAccessor` above): a plain object-literal array is always
// accepted by any chart's `T[]` generic branch regardless of what fields
// `ObjectPoint` declares (TypeScript infers T from the literal itself), so
// splitting this into a donut-only variant would add a type alias without
// preventing anything — bar/line/area/win-loss/lines already structurally
// accept an arbitrary extra field on an object-literal input either way.
type ObjectPoint = { id?: string | number; label?: string; value: number; color?: string };
export type SeriesInput<T> = number[] | ObjectPoint[] | T[];

export function normalizeSeries<T>(
  data: SeriesInput<T>,
  accessors?: SeriesAccessors<T> & Partial<SeriesColorAccessor<T>>,
): Datum[] {
  if (data.length === 0) return [];

  if (accessors) {
    return (data as T[]).map((row, index) => ({
      id: accessors.id ? accessors.id(row, index) : index,
      label: accessors.label ? accessors.label(row, index) : String(accessors.value(row, index)),
      value: accessors.value(row, index),
      index,
      ...(accessors.colorAccessor ? { color: accessors.colorAccessor(row, index) } : {}),
    }));
  }

  if (typeof data[0] === 'number') {
    return (data as number[]).map((value, index) => ({
      id: index,
      label: String(value),
      value,
      index,
    }));
  }

  return (data as ObjectPoint[]).map((d, index) => ({
    id: d.id ?? index,
    label: d.label ?? String(d.value),
    value: d.value,
    index,
    ...(d.color !== undefined ? { color: d.color } : {}),
  }));
}
