import type { Annotation, Mark } from '../types';
import { markClass } from './css-classes';
import { polar, round } from './geometry';
import type { SeriesLayout } from './plot';

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
export type AnnotationPoint = { x: number; y: number } | null;

/** Maps one annotation to its pixel position, or `null` to drop it. */
export type AnnotationMapper = (a: Annotation) => AnnotationPoint;

function isFinitePair(a: Annotation): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y);
}

function inDomain(v: number, domain: [number, number]): boolean {
  return v >= domain[0] && v <= domain[1];
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
 */
export function barAnnotationMapper(
  count: number,
  domain: [number, number],
  catScale: (i: number) => number,
  valueScale: (v: number) => number,
  horizontal: boolean,
): AnnotationMapper {
  return (a) => {
    if (!isFinitePair(a) || !Number.isInteger(a.x) || a.x < 0 || a.x > count - 1) return null;
    if (!inDomain(a.y, domain)) return null;
    const cat = catScale(a.x);
    const val = valueScale(a.y);
    return horizontal ? { x: val, y: cat } : { x: cat, y: val };
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
 * the chart's color, used when an annotation sets none. One mark per
 * annotation, in input order, each classed `nc-annotation nc-annotation-{i}`
 * (the index is the annotation's position in the input array, so a dropped
 * annotation leaves a gap rather than renumbering the rest). Annotations
 * never land in `scene.points` — callers append these marks only.
 */
export function annotationMarks(
  annotations: Annotation[] | undefined,
  toPoint: AnnotationMapper,
  color: string,
): Mark[] {
  if (annotations === undefined) return [];
  const marks: Mark[] = [];
  for (const [i, a] of annotations.entries()) {
    const point = toPoint(a);
    if (point === null) continue;
    const size = Number.isFinite(a.size) && (a.size as number) > 0 ? (a.size as number) : 2;
    const fill = a.color ?? color;
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
  }
  return marks;
}
