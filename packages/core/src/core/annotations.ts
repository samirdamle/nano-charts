import type { Annotation, Mark, ReferenceLine, SceneAnnotationPoint } from '../types';
import { dashFor } from './axis';
import { markClass } from './css-classes';
import { polar, round } from './geometry';
import type { PaddedBox, SeriesLayout } from './plot';

/**
 * Annotations: small marks laid on top of a chart's own marks, in the chart's
 * data coordinates. The shared builder below turns an annotation into its
 * mark once a chart has mapped it to pixel coordinates; the per-chart
 * mappers beside it own the data→pixel step and the out-of-range rule:
 * a mapper returns `null` and the annotation is dropped, never clamped.
 *
 * Follows the highlightMarks precedent: shared helpers in core/, each chart
 * passing its own scales. Unlike highlights, annotations never affect
 * automatic padding — adding one must not move the existing marks — so a
 * mark at a domain edge can extend up to its `size` past the plot box;
 * set explicit `padding` if that clearance matters.
 */

/** Pixel position of an annotation, or `null` to drop it. */
export type AnnotationPoint = { x: number; y: number; color?: string } | null;

/**
 * Maps one annotation to its pixel position, or `null` to drop it. The
 * second argument is the annotation's `seriesIndex` once the builder has
 * validated it as a non-negative integer; mappers that care about series
 * (lines, bar, radar) range-check it against their own series and may
 * return a series color override in `color`.
 */
export type AnnotationMapper = (a: Annotation, seriesIndex?: number) => AnnotationPoint;

/**
 * Wraps a mapper with the shared series rule: a `seriesIndex` at or above
 * `seriesCount` drops the annotation, and a valid one defaults the color
 * to `seriesColor` when the mapper returned none. Charts without series
 * pass 0, so any `seriesIndex` drops. A mapper may still return `null`
 * for a series that is absent in one column (bar's ragged groups).
 */
export function seriesAwareMapper(
  base: AnnotationMapper,
  seriesCount: number,
  seriesColor?: (seriesIndex: number) => string | undefined,
): AnnotationMapper {
  return (a, seriesIndex) => {
    if (seriesIndex !== undefined && seriesIndex >= seriesCount) return null;
    const point = base(a, seriesIndex);
    if (point === null) return null;
    return {
      ...point,
      color: point.color ?? (seriesIndex !== undefined ? seriesColor?.(seriesIndex) : undefined),
    };
  };
}

function isFinitePair(a: Annotation): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y);
}

function inDomain(v: number, domain: [number, number]): boolean {
  return v >= domain[0] && v <= domain[1];
}

/** Integer index inside [0, count): one check for the mappers' index rules. */
function inIndex(v: number, count: number): boolean {
  return Number.isInteger(v) && v >= 0 && v < count;
}

/**
 * Reference-line scales for index charts (line, area, lines): a horizontal
 * line sits at a value on the shared domain, a vertical line at an index
 * (fractional indices interpolate, like annotations). Shared by
 * series-chart and lines so the drop rules stay identical.
 */
export function indexRefLineScales(
  layout: SeriesLayout,
  count: number,
  domain: [number, number],
): {
  horizontal: (v: number) => number | null;
  vertical: (v: number) => number | null;
  box: PaddedBox;
} {
  return {
    horizontal: (v) => (inDomain(v, domain) ? layout.y(v) : null),
    vertical: (v) => (v >= 0 && v <= count - 1 ? layout.x(v) : null),
    box: layout,
  };
}

/**
 * Index-based charts (line, area, lines): `x` is the data index (fractional
 * indices interpolate along the index axis), `y` is the data value.
 */
export function indexAnnotationMapper(
  count: number,
  domain: [number, number],
  layout: SeriesLayout,
): AnnotationMapper {
  return (a) => {
    if (!isFinitePair(a) || a.x < 0 || a.x > count - 1 || !inDomain(a.y, domain)) return null;
    return { x: layout.x(a.x), y: layout.y(a.y) };
  };
}

/** Value-based charts (scatter): `x` and `y` are data values. */
export function xyAnnotationMapper(
  xDomain: [number, number],
  yDomain: [number, number],
  xScale: (v: number) => number,
  yScale: (v: number) => number,
): AnnotationMapper {
  return (a) => {
    if (!isFinitePair(a) || !inDomain(a.x, xDomain) || !inDomain(a.y, yDomain)) return null;
    return { x: xScale(a.x), y: yScale(a.y) };
  };
}

/**
 * Bar charts: `x` is the category index (an integer — a fractional index has
 * no bar to sit on), `y` is the data value on the shared value domain.
 * The category position is the category center; `horizontal` swaps the axes.
 * With a `seriesIndex`, `seriesAt` resolves that series within the column:
 * grouped mode returns the sub-bar's center, other modes return no center
 * (the category center stands) — either way `null` drops the annotation
 * when the series has no segment in that column, and a returned `color`
 * becomes the annotation's default color.
 */
export function barAnnotationMapper(
  count: number,
  domain: [number, number],
  catScale: (i: number) => number,
  valueScale: (v: number) => number,
  horizontal: boolean,
  seriesAt?: (col: number, seriesIndex: number) => { center?: number; color?: string } | null,
): AnnotationMapper {
  return (a, seriesIndex) => {
    if (!isFinitePair(a) || !inIndex(a.x, count)) return null;
    if (!inDomain(a.y, domain)) return null;
    let cat = catScale(a.x);
    let color: string | undefined;
    if (seriesIndex !== undefined && seriesAt) {
      const resolved = seriesAt(a.x, seriesIndex);
      if (resolved === null) return null;
      if (resolved.center !== undefined) cat = resolved.center;
      color = resolved.color;
    }
    const val = valueScale(a.y);
    return horizontal ? { x: val, y: cat, color } : { x: cat, y: val, color };
  };
}

/**
 * Radar: `x` is the axis index (fractional indices interpolate the angle,
 * like line charts), `y` is the value. The mark sits at the polar point
 * regardless of the drawn polygons. Unlike radar's own data policy (values
 * clamp into the domain), out-of-range annotations drop. Angles are in
 * degrees for `polar`, matching the chart's own -90° start.
 */
export function radarAnnotationMapper(
  cx: number,
  cy: number,
  radius: number,
  axisCount: number,
  domainMax: number,
): AnnotationMapper {
  return (a) => {
    if (axisCount <= 0) return null;
    if (!isFinitePair(a) || a.x < 0 || a.x > axisCount - 1) return null;
    if (a.y < 0 || a.y > domainMax) return null;
    const angle = -90 + (a.x * 360) / axisCount;
    const r = domainMax === 0 ? 0 : (a.y / domainMax) * radius;
    const [x, y] = polar(cx, cy, r, angle);
    return { x, y };
  };
}

/**
 * Heatmap: `x` is the column index, `y` the row index — both integers, like
 * bar categories — placed at the cell center (the same formula the axis
 * ticks and highlight zones use). Missing cells in ragged rows drop.
 */
export function heatmapAnnotationMapper(
  box: PaddedBox,
  cell: number,
  rows: number,
  cols: number,
  hasCell: (row: number, col: number) => boolean,
): AnnotationMapper {
  return (a) => {
    if (!isFinitePair(a) || !inIndex(a.x, cols) || !inIndex(a.y, rows) || !hasCell(a.y, a.x)) {
      return null;
    }
    return { x: box.left + a.x * cell + cell / 2, y: box.top + a.y * cell + cell / 2 };
  };
}

/**
 * Pictogram: `x` is the series index, `y` the 1-based block number
 * (matching `scene.points`' `blockNumber`), centered on that block's slot.
 * Partial and empty blocks still count as slots. `horizontal` keeps the
 * logical coordinates — the renderer swaps the axes, as with bars.
 */
export function pictogramAnnotationMapper(
  padding: { left: number; top: number },
  pitch: number,
  blockSize: number,
  horizontal: boolean,
  maxSlots: number,
  slotsPerSeries: number[],
): AnnotationMapper {
  return (a) => {
    if (!isFinitePair(a) || !inIndex(a.x, slotsPerSeries.length)) return null;
    const series = a.x;
    const block = a.y - 1;
    if (!inIndex(block, slotsPerSeries[series] ?? 0)) return null;
    const bx = horizontal ? padding.left + block * pitch : padding.left + series * pitch;
    const by = horizontal
      ? padding.top + series * pitch
      : padding.top + (maxSlots - 1 - block) * pitch;
    return { x: bx + blockSize / 2, y: by + blockSize / 2 };
  };
}

/**
 * Bullet: the chart runs horizontally, so `x` is the value on [0, max] and
 * `y` is ignored; the mark sits on the bullet's centerline (the measure
 * bar's center, matching its scene point).
 */
export function bulletAnnotationMapper(
  xScale: (v: number) => number,
  max: number,
  centerY: number,
): AnnotationMapper {
  return (a) => {
    if (!Number.isFinite(a.x) || a.x < 0 || a.x > max) return null;
    return { x: xScale(a.x), y: centerY };
  };
}

/**
 * WinLoss: `x` is the data index (an integer), `y` is ignored — win/loss
 * blocks don't encode magnitude. The mark centers on that index's block:
 * the upper half for a win, the lower half for a loss, the centerline
 * for a zero.
 */
export function winLossAnnotationMapper(
  slotX: (i: number) => number,
  barWidth: number,
  box: PaddedBox,
  center: number,
  values: number[],
): AnnotationMapper {
  return (a) => {
    if (!inIndex(a.x, values.length)) return null;
    const v = values[a.x]!;
    const cy = v > 0 ? (box.top + center) / 2 : v < 0 ? (center + box.bottom) / 2 : center;
    return { x: slotX(a.x) + barWidth / 2, y: cy };
  };
}

/**
 * Dial charts (donut, gauge): `x` is ignored; `y` maps to an angle as
 * `startAngle + frac × span`, where `frac` is `y`'s fraction across
 * `domain` (gauge: [min, max]; donut gauge: [0, max]; donut segments:
 * [0, total]). The mark sits on the ring at mid-thickness radius.
 */
export function dialAnnotationMapper(
  cx: number,
  cy: number,
  rMid: number,
  startAngle: number,
  span: number,
  domain: [number, number],
): AnnotationMapper {
  return (a) => {
    if (!Number.isFinite(a.y) || !inDomain(a.y, domain)) return null;
    const [d0, d1] = domain;
    const frac = d1 === d0 ? 0 : (a.y - d0) / (d1 - d0);
    const [x, y] = polar(cx, cy, rMid, startAngle + frac * span);
    return { x, y };
  };
}

/**
 * Turns annotations into marks at their mapped pixel positions. `color` is
 * the chart's color, used when an annotation sets none and the mapper
 * returned no series color. One mark per annotation, in input order, each
 * classed `nc-annotation nc-annotation-{i}` (the index is the annotation's
 * position in the input array, so a dropped annotation leaves a gap rather
 * than renumbering the rest). A non-integer or negative `seriesIndex` drops
 * the annotation before mapping; range-checking is the mapper's job (see
 * `seriesAwareMapper`). Annotations never land in `scene.points` — callers
 * append these marks only — and only `interactive: true` annotations land
 * in the returned `annotationPoints`, for the React hit targets.
 */
export function annotationMarks(
  annotations: Annotation[] | undefined,
  toPoint: AnnotationMapper,
  color: string,
): { marks: Mark[]; annotationPoints: SceneAnnotationPoint[] } {
  if (annotations === undefined) return { marks: [], annotationPoints: [] };
  const marks: Mark[] = [];
  const annotationPoints: SceneAnnotationPoint[] = [];
  for (const [i, a] of annotations.entries()) {
    const si = a.seriesIndex;
    const seriesIndex =
      si === undefined ? undefined : Number.isInteger(si) && si >= 0 ? si : null;
    if (seriesIndex === null) continue;
    const point = toPoint(a, seriesIndex);
    if (point === null) continue;
    const size = Number.isFinite(a.size) && (a.size as number) > 0 ? (a.size as number) : 2;
    const fill = a.color ?? point.color ?? color;
    const cls = markClass('annotation', i);
    const { x, y } = point;
    switch (a.shape) {
      case 'dot':
        marks.push({ type: 'circle', class: cls, cx: round(x), cy: round(y), r: round(size), fill });
        break;
      case 'square':
        marks.push({
          type: 'rect',
          class: cls,
          x: round(x - size),
          y: round(y - size),
          width: round(size * 2),
          height: round(size * 2),
          fill,
        });
        break;
      case 'triangle': {
        // Equilateral triangle, point up, center-to-vertex radius = size.
        const half = size * 0.8660254037844386;
        marks.push({
          type: 'path',
          class: cls,
          d:
            `M${round(x)},${round(y - size)}` +
            `L${round(x - half)},${round(y + size / 2)}` +
            `L${round(x + half)},${round(y + size / 2)}Z`,
          fill,
          stroke: 'none',
        });
        break;
      }
      case 'line': {
        const vertical = a.orientation === 'vertical';
        marks.push({
          type: 'line',
          class: cls,
          x1: round(vertical ? x : x - size),
          y1: round(vertical ? y - size : y),
          x2: round(vertical ? x : x + size),
          y2: round(vertical ? y + size : y),
          stroke: fill,
          strokeWidth: 1,
        });
        break;
      }
      case 'emoji': {
        // No fill: multicolour emoji ignore it anyway, and monochrome
        // glyphs inherit currentColor — the same as the chart's text.
        // Baseline nudged like center labels so the glyph reads centered.
        if (!a.emoji) continue;
        marks.push({
          type: 'text',
          class: cls,
          x: round(x),
          y: round(y + size * 0.35),
          text: a.emoji,
          fontSize: round(size),
          textAnchor: 'middle',
        });
        break;
      }
      default:
        // Unknown shape at runtime: drop, never throw.
        continue;
    }
    if (a.interactive) {
      annotationPoints.push({
        annotationIndex: i,
        x: round(x),
        y: round(y),
        ...(a.label !== undefined ? { label: a.label } : {}),
        ...(seriesIndex !== undefined ? { seriesIndex } : {}),
      });
    }
  }
  return { marks, annotationPoints };
}

/**
 * Turns reference lines into full-span line marks. `scales.horizontal`
 * maps a horizontal line's value to its pixel y (or `null` to drop it)
 * and `scales.vertical` maps a vertical line's value to its pixel x; each
 * chart supplies these from its own scales and drop rules, so the builder
 * stays chart-agnostic. Lines span the plot box only, never the padding.
 * Styling mirrors the annotation defaults: `currentColor` via the chart
 * color, thickness 1, and the shared `dashFor` mapping for style.
 */
export function referenceLineMarks(
  lines: ReferenceLine[] | undefined,
  scales: {
    horizontal: (v: number) => number | null;
    vertical: (v: number) => number | null;
    box: PaddedBox;
  },
  color: string,
): Mark[] {
  if (lines === undefined) return [];
  const { box } = scales;
  const marks: Mark[] = [];
  for (const [i, line] of lines.entries()) {
    if (!Number.isFinite(line.value)) continue;
    if (line.orientation !== 'horizontal' && line.orientation !== 'vertical') continue;
    const thickness =
      Number.isFinite(line.thickness) && (line.thickness as number) > 0
        ? (line.thickness as number)
        : 1;
    const stroke = line.color ?? color;
    const cls = markClass('reference-line', i);
    const horizontal = line.orientation === 'horizontal';
    const pos = horizontal ? scales.horizontal(line.value) : scales.vertical(line.value);
    if (pos === null) continue;
    marks.push({
      type: 'line',
      class: cls,
      x1: round(horizontal ? box.left : pos),
      y1: round(horizontal ? pos : box.top),
      x2: round(horizontal ? box.right : pos),
      y2: round(horizontal ? pos : box.bottom),
      stroke,
      strokeWidth: thickness,
      ...dashFor(line.style),
    });
  }
  return marks;
}
