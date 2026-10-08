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
import { dashFor } from '../core/axis';

/** The repeated unit block. Defined once in `<defs>`, stamped with `<use>`. */
export type PictogramBlock =
  | { kind: 'rect'; radius?: number }
  | { kind: 'circle' }
  | { kind: 'emoji'; emoji: string };

/** How an empty (unfilled) block renders. */
export type PictogramEmptyVariant = 'solid' | 'ring';

/** Per-block paint rule, addressed by block span. Later rules win, per field. */
export interface PictogramBlockStyle {
  /** Block indices this rule applies to, inclusive. Out-of-range indices are
   * clamped to the rendered blocks; direction does not matter. */
  span: [number, number];
  /** Main paint — the block's fill. Defaults to the block's resolved color. */
  color?: string;
  /** Border paint. Defaults to `'none'` — or to the color when `variant` is
   * `'ring'`. */
  stroke?: string;
  /** Border width in px. Defaults to 25% of `blockSize` (min 1.5px). Applies
   * when a stroke is drawn. */
  strokeWidth?: number;
  /** `'solid'` fills the block; `'ring'` draws only its border (fill none,
   * stroke in the color). Defaults to `'solid'`. */
  variant?: 'solid' | 'ring';
  /** Shape override for this span. */
  block?: PictogramBlock;
}

/** Line style for a pictogram connector. */
export type PictogramConnectorStyle = 'solid' | 'dashed' | 'dotted';

/** One connector segment: a line from the center of one block to the center
 * of another, drawn behind the blocks. */
export interface PictogramConnectorSegment {
  /** Block indices at the segment's two ends, inclusive — the line runs from
   * the center of `span[0]` to the center of `span[1]` (direction does not
   * matter). Out-of-range indices are clamped to the rendered blocks; a
   * zero-length span is skipped. */
  span: [number, number];
  /** Segment color. Defaults to the connector-level `color`. */
  color?: string;
  /** Segment thickness in px. Defaults to the connector-level `thickness`. */
  thickness?: number;
  /** Segment style. Defaults to the connector-level `style`. */
  style?: PictogramConnectorStyle;
}

/** Options for the optional lines joining a series' rendered blocks. */
export interface PictogramConnectorOptions {
  /** Default segment color. Defaults to the earlier block's resolved color,
   * so the line continues the block it leaves. */
  color?: string;
  /** Default segment thickness in px. Defaults to 2. */
  thickness?: number;
  /** Default segment style. Defaults to `'solid'`. */
  style?: PictogramConnectorStyle;
  /** Explicit segments. When present, only these render, in order (so later
   * entries draw over earlier ones). When absent, every adjacent block pair
   * is joined with the top-level styling. */
  segments?: PictogramConnectorSegment[];
}

/** Accessor for per-row filled-block counts (custom object input). */
export type FilledAccessor<T> = (row: T, index: number) => number;

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
  /** Filled leading blocks for every series; a datum-level `filled` wins.
   * The rest render as empty (see `emptyColor`/`emptyVariant`). Defaults to
   * each datum's `value` (everything filled). */
  filled?: number;
  /** Accessor for per-row filled-block counts. A datum-level `filled` field
   * wins over this. */
  filledAccessor?: FilledAccessor<T>;
  /** Paint for empty (unfilled) blocks. Defaults to the block's base color. */
  emptyColor?: string;
  /** How empty blocks render: `'solid'` dims the block (like the empty slot
   * under a partial block), `'ring'` draws only its border. Defaults to
   * `'solid'`. */
  emptyVariant?: PictogramEmptyVariant;
  /** Span-based per-block styling applied to every series, in order — later
   * rules win, per field. Datum-level `blockStyles` apply after these. */
  blockStyles?: PictogramBlockStyle[];
  /** Draw lines joining a series' rendered blocks, behind the blocks. By
   * default every adjacent block pair is joined with uniform styling; pass
   * `segments` for explicit spans with per-segment styling. Series with
   * fewer than two blocks get no connector. Off by default. */
  connector?: PictogramConnectorOptions;
}

type PictogramDatum<T> =
  | number
  | {
      id?: string | number;
      label?: string;
      value: number;
      /** Filled leading blocks; the rest render as empty. Defaults to `value`. */
      filled?: number;
      color?: string;
      /** Per-series style rules, applied after the options-level ones. */
      blockStyles?: PictogramBlockStyle[];
    }
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

/** Clamp a `[number, number]` span to `[0, total - 1]` (direction-free);
 * returns null when the span is unusable or covers nothing. */
function clampSpan(span: [number, number] | undefined, total: number): [number, number] | null {
  if (!Array.isArray(span) || total <= 0) return null;
  const a = span[0];
  const b = span[1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const lo = Math.max(0, Math.min(total - 1, Math.floor(Math.min(a, b))));
  const hi = Math.max(0, Math.min(total - 1, Math.floor(Math.max(a, b))));
  return lo <= hi ? [lo, hi] : null;
}

interface BlockShapeParts {
  shape: 'rect' | 'circle' | 'emoji';
  radius?: number;
  emoji?: string;
}

/** Resolve a `PictogramBlock` to its shape parts; returns null when the value
 * carries nothing usable (so the caller falls back to the chart-level shape). */
function resolveBlockShape(b: PictogramBlock | undefined): BlockShapeParts | null {
  if (!b) return null;
  if (b.kind === 'circle') return { shape: 'circle' };
  if (b.kind === 'emoji' && b.emoji) return { shape: 'emoji', emoji: b.emoji };
  if (b.kind === 'rect') {
    const radius =
      b.radius !== undefined && Number.isFinite(b.radius) && b.radius > 0 ? b.radius : undefined;
    return { shape: 'rect', radius };
  }
  return null;
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

  const chartShape: BlockShapeParts = resolveBlockShape(options.block) ?? { shape: 'rect' };
  const blockId = `${idPrefix}-block`;

  const emptyVariant: PictogramEmptyVariant = options.emptyVariant ?? 'solid';
  const emptyColor = options.emptyColor;
  const defaultStrokeWidth = Math.max(1.5, round(s * 0.25));

  const accessors = options.value
    ? {
        value: options.value,
        label: options.label,
        id: options.id,
        colorAccessor: options.colorAccessor,
        filledAccessor: options.filledAccessor,
      }
    : undefined;
  interface ResolvedDatum extends Datum {
    filledRaw?: number;
    blockStyles?: PictogramBlockStyle[];
  }
  // Normalize each datum independently so plain numbers and objects can mix
  // in one array (normalizeSeries branches on the first element's type).
  // Unlike the single-call form, this keeps the real category index for
  // accessor callbacks.
  const normalizeDatum = (d: SeriesInput<T>, j: number): ResolvedDatum => {
    if (accessors) {
      const row = d as T;
      const value = accessors.value(row, j);
      const f = accessors.filledAccessor ? accessors.filledAccessor(row, j) : undefined;
      return {
        id: accessors.id ? accessors.id(row, j) : j,
        label: accessors.label ? accessors.label(row, j) : String(value),
        value: toFiniteNumber(value),
        index: j,
        ...(accessors.colorAccessor ? { color: accessors.colorAccessor(row, j) } : {}),
        filledRaw: typeof f === 'number' ? f : undefined,
      };
    }
    const row = normalizeSeries([d] as SeriesInput<T>)[0]!;
    const obj = (
      typeof d === 'number' ? null : d
    ) as { id?: string | number; filled?: number; blockStyles?: PictogramBlockStyle[] } | null;
    const f = obj?.filled;
    const explicitId = obj?.id;
    return {
      ...row,
      id: explicitId ?? j,
      index: j,
      filledRaw: typeof f === 'number' ? f : undefined,
      blockStyles: Array.isArray(obj?.blockStyles) ? obj.blockStyles : undefined,
    };
  };
  const datums: ResolvedDatum[] = (data as SeriesInput<T>[]).map((d, j) => normalizeDatum(d, j));

  const n = datums.length;
  const pitch = s + g;
  const counts = datums.map((d) => {
    const c = d.value / unit;
    return Number.isFinite(c) && c > 0 ? c : 0;
  });
  // Fill counts live in the same data units as `value`: `filled` defaults to
  // `value` (everything filled) and clamps to [0, count].
  const fillCounts = datums.map((d, j) => {
    const raw = d.filledRaw ?? options.filled;
    const fc = raw !== undefined ? raw / unit : counts[j]!;
    return Number.isFinite(fc) ? Math.max(0, Math.min(counts[j]!, fc)) : counts[j]!;
  });
  const splits = counts.map(splitCount);
  const fillSplits = fillCounts.map(splitCount);
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

  const marks: Mark[] = [
    { type: 'defs', id: blockId, shape: chartShape.shape, size: s, radius: chartShape.radius, emoji: chartShape.emoji },
  ];
  const points: ScenePoint[] = [];
  let clipCounter = 0;
  let pointIndex = 0;

  // Registry of shape → <defs> id, so per-span shape overrides reuse one
  // definition per distinct shape. The chart-level shape is entry zero.
  const shapeDefs = new Map<string, string>();
  const shapeKey = (shape: string, radius?: number, emoji?: string): string =>
    `${shape}|${radius ?? ''}|${emoji ?? ''}`;
  shapeDefs.set(shapeKey(chartShape.shape, chartShape.radius, chartShape.emoji), blockId);
  const defsIdFor = (parts: BlockShapeParts): string => {
    const key = shapeKey(parts.shape, parts.radius, parts.emoji);
    const hit = shapeDefs.get(key);
    if (hit) return hit;
    const id = `${idPrefix}-block-${shapeDefs.size}`;
    shapeDefs.set(key, id);
    marks.push({ type: 'defs', id, shape: parts.shape, size: s, radius: parts.radius, emoji: parts.emoji });
    return id;
  };

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
    const total = slots[j]!;
    const { full: fillFull, fraction: fillFraction } = fillSplits[j]!;

    interface ResolvedBlock {
      state: 'filled' | 'partial' | 'empty';
      /** Resolved main color, before variant mapping (what connectors continue). */
      paint: string;
      fill: string;
      stroke?: string;
      strokeWidth?: number;
      fillOpacity: number;
      shape: 'rect' | 'circle' | 'emoji';
      radius?: number;
      emoji?: string;
    }
    // Resolution order per block: series base color → `filled`/empty
    // treatment → `blockStyles` rules (options-level, then datum-level),
    // each rule overriding its fields independently; later rules win.
    const resolveBlock = (k: number): ResolvedBlock => {
      const isPartial = k === fillFull && fillFraction > 0;
      const state: ResolvedBlock['state'] = k < fillFull ? 'filled' : isPartial ? 'partial' : 'empty';
      let paint = color;
      let variant: 'solid' | 'ring' = 'solid';
      let stroke: string | undefined;
      let strokeWidth: number | undefined;
      let shapeParts: BlockShapeParts = chartShape;
      let fillOpacity = 1;
      if (state === 'empty') {
        paint = emptyColor ?? paint;
        variant = emptyVariant;
        if (variant === 'solid') fillOpacity = 0.25;
      }
      const rules = [...(options.blockStyles ?? []), ...(datum.blockStyles ?? [])];
      for (const rule of rules) {
        if (!rule) continue;
        const covered = clampSpan(rule.span, total);
        if (!covered || k < covered[0] || k > covered[1]) continue;
        if (rule.color !== undefined) paint = rule.color;
        if (rule.stroke !== undefined) stroke = rule.stroke;
        if (rule.strokeWidth !== undefined && Number.isFinite(rule.strokeWidth) && rule.strokeWidth > 0) {
          strokeWidth = rule.strokeWidth;
        }
        if (rule.variant !== undefined) variant = rule.variant;
        const override = resolveBlockShape(rule.block);
        if (override) shapeParts = override;
      }
      const w = strokeWidth ?? defaultStrokeWidth;
      if (variant === 'ring' && shapeParts.shape !== 'emoji') {
        return {
          state,
          paint,
          fill: 'none',
          stroke: stroke ?? paint,
          strokeWidth: w,
          fillOpacity: 1,
          shape: shapeParts.shape,
          radius: shapeParts.radius,
          emoji: shapeParts.emoji,
        };
      }
      // A ring has no meaningful stroke rendering on emoji text: fall back
      // to the dimmed treatment instead.
      if (variant === 'ring') fillOpacity = 0.25;
      return {
        state,
        paint,
        fill: paint,
        stroke,
        strokeWidth: stroke !== undefined ? w : undefined,
        fillOpacity,
        shape: shapeParts.shape,
        radius: shapeParts.radius,
        emoji: shapeParts.emoji,
      };
    };

    const conn = options.connector;
    if (conn && total >= 2) {
      // Every gap between adjacent blocks gets its own line, center to
      // center, pushed before the series' block marks so connectors render
      // behind the blocks. Per-gap lines (rather than one spanning line)
      // restart the dash pattern at every block, so dashed/dotted styles
      // read as uniform connectors instead of broken fragments. A gap's
      // default color is the earlier block's resolved paint, so the line
      // continues the block it leaves.
      const posThickness = (v: number | undefined, fallback: number): number =>
        v !== undefined && Number.isFinite(v) && v > 0 ? v : fallback;
      const baseThickness = posThickness(conn.thickness, 2);
      const baseStyle = conn.style;
      interface GapDraw {
        from: number;
        to: number;
        stroke: string;
        strokeWidth: number;
        style: PictogramConnectorStyle | undefined;
      }
      const draws: GapDraw[] = [];
      if (Array.isArray(conn.segments)) {
        for (const seg of conn.segments) {
          const covered = clampSpan(seg?.span, total);
          if (!covered) continue;
          const [from, to] = covered;
          if (from >= to) continue;
          const strokeWidth = posThickness(seg.thickness, baseThickness);
          const style = seg.style ?? baseStyle;
          // Subdivide long spans per gap so dash patterns stay uniform.
          for (let k = from; k < to; k++) {
            draws.push({
              from: k,
              to: k + 1,
              stroke: seg.color ?? conn.color ?? resolveBlock(k).paint,
              strokeWidth,
              style,
            });
          }
        }
      } else {
        for (let k = 0; k < total - 1; k++) {
          draws.push({
            from: k,
            to: k + 1,
            stroke: conn.color ?? resolveBlock(k).paint,
            strokeWidth: baseThickness,
            style: baseStyle,
          });
        }
      }
      // Block-center coordinate along the series axis.
      const center = (k: number): number =>
        horizontal
          ? round(padding.left + k * pitch + s / 2)
          : round(padding.top + (maxSlots - 1 - k) * pitch + s / 2);
      const fixed = horizontal
        ? round(padding.top + j * pitch + s / 2)
        : round(padding.left + j * pitch + s / 2);
      for (const d of draws) {
        const { strokeDasharray } = dashFor(d.style);
        marks.push(
          horizontal
            ? {
                type: 'line',
                x1: center(d.from),
                y1: fixed,
                x2: center(d.to),
                y2: fixed,
                stroke: d.stroke,
                strokeWidth: d.strokeWidth,
                strokeDasharray,
                strokeLinecap: 'round',
              }
            : {
                type: 'line',
                x1: fixed,
                y1: center(d.from),
                x2: fixed,
                y2: center(d.to),
                stroke: d.stroke,
                strokeWidth: d.strokeWidth,
                strokeDasharray,
                strokeLinecap: 'round',
              },
        );
      }
    }
    for (let k = 0; k < total; k++) {
      const b = resolveBlock(k);
      const isPartial = b.state === 'partial';
      // Vertical: columns left→right, blocks stack bottom-up.
      // Horizontal: rows top→bottom, blocks stack left→right.
      const bx = horizontal ? padding.left + k * pitch : padding.left + j * pitch;
      const by = horizontal ? padding.top + j * pitch : padding.top + (maxSlots - 1 - k) * pitch;
      const x = round(bx);
      const y = round(by);
      const href = `#${defsIdFor({ shape: b.shape, radius: b.radius, emoji: b.emoji })}`;

      if (isPartial) {
        const partialId = `${idPrefix}-partial-${clipCounter++}`;
        // Pre-clipped block variant, defined once in <defs>: the clip rect is
        // in the block's local coordinates (left-to-right for rows,
        // bottom-up for columns). The overlay <use> below stays plain because
        // clip-path placed directly on <use> does not render in browsers.
        // A partial block always renders with the filled treatment — it is
        // progress in motion, not an empty block.
        const clip = horizontal
          ? { x: 0, y: 0, width: round(fillFraction * s), height: round(s) }
          : { x: 0, y: round(s - fillFraction * s), width: round(s), height: round(fillFraction * s) };
        marks.push({ type: 'defs', id: partialId, shape: b.shape, size: s, radius: b.radius, emoji: b.emoji, clip });
        // The "empty slot" at low opacity, then the filled fraction on top.
        marks.push({ type: 'use', href, x, y, fill: b.paint, fillOpacity: 0.25, index: pointIndex });
        marks.push({ type: 'use', href: `#${partialId}`, x, y, fill: b.paint, index: pointIndex });
      } else {
        marks.push({
          type: 'use',
          href,
          x,
          y,
          fill: b.fill,
          ...(b.fillOpacity !== 1 ? { fillOpacity: b.fillOpacity } : {}),
          ...(b.stroke !== undefined ? { stroke: b.stroke, strokeWidth: b.strokeWidth } : {}),
          index: pointIndex,
        });
      }

      points.push({
        id: `${j}:${k}`,
        label: datum.label,
        value: b.state === 'empty' ? 0 : isPartial ? round(fillFraction * unit) : unit,
        index: pointIndex,
        x: round(bx + s / 2),
        y: round(by + s / 2),
        w: s,
        h: s,
        col: j,
        blockNumber: k + 1,
        blocksTotal: total,
        partial: isPartial ? true : undefined,
        empty: b.state === 'empty' ? true : undefined,
      });
      pointIndex++;
    }
  });

  return { ...base, marks, points };
}
