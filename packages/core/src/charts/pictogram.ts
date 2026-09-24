import type { BaseOptions, Datum, Mark, Scene, ScenePoint } from '../types';
import { round } from '../core/geometry';
import {
  normalizeSeries,
  toFiniteNumber,
  type SeriesAccessors,
  type SeriesColorAccessor,
  type SeriesInput,
} from '../core/normalize';
import { pastelColor, resolveSegmentColor } from '../core/palette';
import { resolvePadding } from '../core/plot';

/** The repeated unit block. Defined once in `<defs>`, stamped with `<use>`. */
export type PictogramBlock =
  | { kind: 'rect'; radius?: number }
  | { kind: 'circle' }
  | { kind: 'emoji'; emoji: string };

export interface PictogramOptions<T = number>
  extends BaseOptions,
    Partial<SeriesAccessors<T>>,
    Partial<SeriesColorAccessor<T>> {
  /** Block shape. Defaults to a square rect. */
  block?: PictogramBlock;
  /** Block edge in px. Defaults to 8. */
  blockSize?: number;
  /** Space between blocks (and between columns/rows) as a fraction of
   * `blockSize`, like `bar()`'s gap. Defaults to 0.25. */
  gap?: number;
  /** Stack blocks left-to-right in rows instead of bottom-up in columns. */
  horizontal?: boolean;
  /** Data value represented by one block. Defaults to 1. */
  unit?: number;
  /** Prefix for the `<defs>` block id (and clip ids). Defaults to a unique
   * value per chart so several pictograms can be inlined in one document;
   * pass an explicit value to take control of the ids. */
  idPrefix?: string;
}

type PictogramDatum<T> =
  | number
  | { id?: string | number; label?: string; value: number; color?: string }
  | T;
export type PictogramInput<T = number> = PictogramDatum<T>[];

function positiveFinite(v: number | undefined, fallback: number): number {
  return v !== undefined && Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Per-chart counter so the default `idPrefix` is unique document-wide.
 * `<use href="#…">` resolves against the whole document, not the enclosing
 * svg, so two pictograms sharing `pictogram-block` would render each
 * other's shape. */
let pictogramUid = 0;

/** Split a block count into whole blocks plus an optional partial fraction,
 * snapping float dust at both ends. */
function splitCount(count: number): { full: number; fraction: number } {
  const full = Math.floor(count);
  const fraction = count - full;
  if (fraction >= 0.99) return { full: full + 1, fraction: 0 };
  if (fraction < 0.01) return { full, fraction: 0 };
  return { full, fraction };
}

export function pictogram<T = number>(
  data: PictogramInput<T>,
  options: PictogramOptions<T> = {},
): Scene {
  const padding = resolvePadding(options.padding, 0);
  const s = positiveFinite(options.blockSize, 8);
  const gapOpt = options.gap;
  const gap = gapOpt !== undefined && Number.isFinite(gapOpt) && gapOpt >= 0 ? gapOpt : 0.25;
  const g = gap * s;
  const unit = positiveFinite(options.unit, 1);
  const horizontal = options.horizontal ?? false;
  const idPrefix = options.idPrefix ?? `pictogram-${++pictogramUid}`;

  const blockOpt = options.block;
  const shape: 'rect' | 'circle' | 'emoji' =
    blockOpt?.kind === 'circle' ? 'circle' : blockOpt?.kind === 'emoji' && blockOpt.emoji ? 'emoji' : 'rect';
  const radius =
    shape === 'rect' && blockOpt?.kind === 'rect' && blockOpt.radius !== undefined && Number.isFinite(blockOpt.radius) && blockOpt.radius > 0
      ? blockOpt.radius
      : undefined;
  const emoji = shape === 'emoji' && blockOpt?.kind === 'emoji' ? blockOpt.emoji : undefined;
  const blockId = `${idPrefix}-block`;

  const accessors = options.value
    ? {
        value: options.value,
        label: options.label,
        id: options.id,
        colorAccessor: options.colorAccessor,
      }
    : undefined;
  // Normalize each datum independently so plain numbers and objects can mix
  // in one array (normalizeSeries branches on the first element's type).
  // Unlike the single-call form, this keeps the real category index for
  // accessor callbacks.
  const normalizeDatum = (d: SeriesInput<T>, j: number): Datum => {
    if (accessors) {
      const row = d as T;
      const value = accessors.value(row, j);
      return {
        id: accessors.id ? accessors.id(row, j) : j,
        label: accessors.label ? accessors.label(row, j) : String(value),
        value: toFiniteNumber(value),
        index: j,
        ...(accessors.colorAccessor ? { color: accessors.colorAccessor(row, j) } : {}),
      };
    }
    const row = normalizeSeries([d] as SeriesInput<T>)[0]!;
    const explicitId = typeof d === 'number' ? undefined : (d as { id?: string | number } | null)?.id;
    return { ...row, id: explicitId ?? j, index: j };
  };
  const datums: Datum[] = (data as SeriesInput<T>[]).map((d, j) => normalizeDatum(d, j));

  const n = datums.length;
  const pitch = s + g;
  const counts = datums.map((d) => {
    const c = d.value / unit;
    return Number.isFinite(c) && c > 0 ? c : 0;
  });
  const splits = counts.map(splitCount);
  const slots = splits.map((sp) => sp.full + (sp.fraction > 0 ? 1 : 0));
  const maxSlots = slots.length > 0 ? Math.max(...slots) : 0;

  const span = (k: number) => k * s + Math.max(0, k - 1) * g;
  const width = horizontal ? span(maxSlots) : span(n);
  const height = horizontal ? span(n) : span(maxSlots);

  const axisWord = horizontal ? 'rows' : 'columns';
  const title = options.title ?? 'pictogram chart';
  const desc =
    options.desc ??
    (n === 0
      ? `${title}, no data`
      : `${title}, ${n} ${axisWord}, counts ${splits
          .map((sp) => String(round(sp.full + sp.fraction)))
          .join(', ')}`);

  const base: Scene = {
    width: round(width + padding.left + padding.right),
    height: round(height + padding.top + padding.bottom),
    viewBox: `0 0 ${round(width + padding.left + padding.right)} ${round(height + padding.top + padding.bottom)}`,
    marks: [],
    points: [],
    a11y: { title, desc },
  };
  if (n === 0) return base;

  const marks: Mark[] = [{ type: 'defs', id: blockId, shape, size: s, radius, emoji }];
  const points: ScenePoint[] = [];
  const href = `#${blockId}`;
  let clipCounter = 0;
  let pointIndex = 0;

  const hasUniformColor = options.color !== undefined;

  datums.forEach((datum, j) => {
    const color = resolveSegmentColor({
      explicit: datum.color,
      uniform: options.color ?? 'currentColor',
      usePalette: !hasUniformColor,
      paletteIndex: j,
      paletteTotal: n,
      // Blocks default to the pastel palette rather than the categorical one.
      palette: pastelColor,
    });
    const { full, fraction } = splits[j]!;
    const total = slots[j]!;
    for (let k = 0; k < total; k++) {
      const isPartial = k === full && fraction > 0;
      // Vertical: columns left→right, blocks stack bottom-up.
      // Horizontal: rows top→bottom, blocks stack left→right.
      const bx = horizontal ? padding.left + k * pitch : padding.left + j * pitch;
      const by = horizontal ? padding.top + j * pitch : padding.top + (maxSlots - 1 - k) * pitch;
      const x = round(bx);
      const y = round(by);

      if (isPartial) {
        const partialId = `${idPrefix}-partial-${clipCounter++}`;
        // Pre-clipped block variant, defined once in <defs>: the clip rect is
        // in the block's local coordinates (left-to-right for rows,
        // bottom-up for columns). The overlay <use> below stays plain because
        // clip-path placed directly on <use> does not render in browsers.
        const clip = horizontal
          ? { x: 0, y: 0, width: round(fraction * s), height: round(s) }
          : { x: 0, y: round(s - fraction * s), width: round(s), height: round(fraction * s) };
        marks.push({ type: 'defs', id: partialId, shape, size: s, radius, emoji, clip });
        // The "empty slot" at low opacity, then the filled fraction on top.
        marks.push({ type: 'use', href, x, y, fill: color, fillOpacity: 0.25, index: pointIndex });
        marks.push({ type: 'use', href: `#${partialId}`, x, y, fill: color, index: pointIndex });
      } else {
        marks.push({ type: 'use', href, x, y, fill: color, index: pointIndex });
      }

      points.push({
        id: `${j}:${k}`,
        label: datum.label,
        value: isPartial ? round(fraction * unit) : unit,
        index: pointIndex,
        x: round(bx + s / 2),
        y: round(by + s / 2),
        w: s,
        h: s,
        col: j,
        blockNumber: k + 1,
        blocksTotal: total,
        partial: isPartial ? true : undefined,
      });
      pointIndex++;
    }
  });

  return { ...base, marks, points };
}
