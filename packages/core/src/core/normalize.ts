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

// Clamp policy: a non-finite value (NaN, Infinity, or a non-numeric row) can
// never become geometry, so it normalizes to 0 instead of poisoning
// downstream math with NaN.
export function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Single-datum form of the accessors branch below, shared by
 * `normalizeSeries` and pictogram's per-datum path (which normalizes each
 * datum independently so plain numbers and objects can mix in one array).
 * The value is read once so a label fallback and the value itself can never
 * disagree.
 */
export function normalizeDatum<T>(
  row: T,
  index: number,
  accessors: SeriesAccessors<T> & Partial<SeriesColorAccessor<T>>,
): Datum {
  const value = accessors.value(row, index);
  return {
    id: accessors.id ? accessors.id(row, index) : index,
    label: accessors.label ? accessors.label(row, index) : String(value),
    value: toFiniteNumber(value),
    index,
    ...(accessors.colorAccessor ? { color: accessors.colorAccessor(row, index) } : {}),
  };
}

export function normalizeSeries<T>(
  data: SeriesInput<T>,
  accessors?: SeriesAccessors<T> & Partial<SeriesColorAccessor<T>>,
): Datum[] {
  if (data.length === 0) return [];

  if (accessors) {
    return (data as T[]).map((row, index) => normalizeDatum(row, index, accessors));
  }

  if (typeof data[0] === 'number') {
    return (data as number[]).map((value, index) => ({
      id: index,
      label: String(value),
      value: toFiniteNumber(value),
      index,
    }));
  }

  return (data as ObjectPoint[]).map((d, index) => {
    const row = (d ?? {}) as ObjectPoint;
    return {
      id: row.id ?? index,
      label: row.label ?? String(row.value),
      value: toFiniteNumber(row.value),
      index,
      ...(row.color !== undefined ? { color: row.color } : {}),
    };
  });
}
