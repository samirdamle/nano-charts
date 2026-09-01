import type { Datum } from '../types';

export type ValueAccessor<T> = (row: T, index: number) => number;
export type LabelAccessor<T> = (row: T, index: number) => string;
export type IdAccessor<T> = (row: T, index: number) => string | number;

export interface SeriesAccessors<T> {
  value: ValueAccessor<T>;
  label?: LabelAccessor<T>;
  id?: IdAccessor<T>;
}

type ObjectPoint = { id?: string | number; label?: string; value: number };
export type SeriesInput<T> = number[] | ObjectPoint[] | T[];

export function normalizeSeries<T>(
  data: SeriesInput<T>,
  accessors?: SeriesAccessors<T>,
): Datum[] {
  if (data.length === 0) return [];

  if (accessors) {
    return (data as T[]).map((row, index) => ({
      id: accessors.id ? accessors.id(row, index) : index,
      label: accessors.label ? accessors.label(row, index) : String(accessors.value(row, index)),
      value: accessors.value(row, index),
      index,
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
  }));
}
