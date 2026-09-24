import type { Datum } from '../types';
import { extent } from './geometry';

export function seriesSummary(kind: string, datums: Datum[]): { title: string; desc: string } {
  const title = `${kind} chart`;
  if (datums.length === 0) return { title, desc: `${title}, no data` };
  const values = datums.map((d) => d.value);
  const [min, max] = extent(values);
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const trend = last > first ? 'up' : last < first ? 'down' : 'flat';
  const desc = `${title}, ${datums.length} points, trend ${trend}, min ${min}, max ${max}`;
  return { title, desc };
}
