export type Datum = {
  id: string | number;
  label: string;
  value: number;
  index: number;
  color?: string;
};

export type Mark =
  | {
      type: 'polyline';
      points: [number, number][];
      stroke?: string;
      strokeWidth?: number;
      fill?: 'none';
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
      /** Generated CSS classes, e.g. `"nc-point nc-point-3"`. */
      class?: string;
    }
  | {
      type: 'path';
      d: string;
      fill?: string;
      fillOpacity?: number;
      stroke?: string;
      strokeWidth?: number;
      strokeOpacity?: number;
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
      /** Generated CSS classes, e.g. `"nc-point nc-point-3"`. */
      class?: string;
    }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill?: string; fillOpacity?: number; rx?: number; index?: number; /** Generated CSS classes, e.g. `"nc-bar nc-bar-2"`. */ class?: string }
  | {
      type: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      index?: number;
      seriesIndex?: number;
      /** Generated CSS classes, e.g. `"nc-point nc-point-3"`. */
      class?: string;
    }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number; strokeDasharray?: string; strokeLinecap?: 'butt' | 'round' | 'square'; /** Generated CSS classes, e.g. `"nc-connector nc-connector-0"`. */ class?: string }
  | {
      type: 'text';
      x: number;
      y: number;
      text: string;
      fontSize?: number;
      fontWeight?: string | number;
      fill?: string;
      textAnchor?: 'start' | 'middle' | 'end';
      /** Generated CSS classes, e.g. `"nc-label"`. */
      class?: string;
    }
  | {
      type: 'defs';
      id: string;
      shape: 'rect' | 'circle' | 'emoji';
      size: number;
      radius?: number;
      emoji?: string;
      /**
       * Pre-clipped variant for partial blocks: the shape is wrapped in a
       * `<g clip-path>` inside `<defs>`, with the clip rect in the block's
       * local coordinates. clip-path placed directly on `<use>` does not
       * render in browsers, so partial overlays reference this variant
       * with a plain `<use>` instead.
       */
      clip?: { x: number; y: number; width: number; height: number };
    }
  | {
      type: 'use';
      href: string;
      x: number;
      y: number;
      fill?: string;
      fillOpacity?: number;
      /** Border paint. Renderers default to `'none'` when absent. */
      stroke?: string;
      strokeWidth?: number;
      index?: number;
      /** Generated CSS classes, e.g. `"nc-block nc-block-3"`. */
      class?: string;
    };

/** Value context passed to a centerLabel formatter: the dial's value, its
 * domain, and the value's fraction across that domain. */
export interface CenterLabelContext {
  value: number;
  min: number;
  max: number;
  frac: number;
}

export interface ScenePoint {
  id: string | number;
  label: string;
  value: number;
  index: number;
  x: number;
  y: number;
  row?: number;
  col?: number;
  w?: number;
  h?: number;
  seriesIndex?: number;
  seriesLabel?: string;
  /** Pictogram: 1-based position of the block within its column/row. */
  blockNumber?: number;
  /** Pictogram: total blocks (slots) in the block's column/row. */
  blocksTotal?: number;
  /** Pictogram: whether the block is a fractional partial fill. */
  partial?: boolean;
  /** Pictogram: whether the block is unfilled (beyond `filled`). */
  empty?: boolean;
}

export interface Scene {
  width: number;
  height: number;
  viewBox: string;
  marks: Mark[];
  points: ScenePoint[];
  /** Hit entries for interactive annotations only; absent when none exist. */
  annotationPoints?: SceneAnnotationPoint[];
  a11y: { title: string; desc: string };
  /** Developer CSS class(es) for the `<svg>` element, from `BaseOptions.class`. */
  svgClass?: string;
}

/** Shape of one annotation mark, laid on top of the chart's own marks. */
export type AnnotationShape = 'dot' | 'square' | 'triangle' | 'line' | 'emoji';

/**
 * One annotation, in the chart's data coordinates (see each chart's docs for
 * what `x` and `y` mean there). `size` is one number interpreted per shape:
 * dot radius, square half-side, triangle center-to-vertex radius, line
 * half-length, emoji font size. Defaults to 2. `color` defaults to the
 * chart's color; it is ignored for `emoji`, whose own colours win.
 */
export interface Annotation {
  x: number;
  y: number;
  shape: AnnotationShape;
  color?: string;
  size?: number;
  /** Required when `shape` is `'emoji'`: the character(s) to render. */
  emoji?: string;
  /** Line shape only: `'horizontal'` (default) or `'vertical'`. */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Series targeting (v2): the series this annotation belongs to, by
   * position (matches `scene.points`' `seriesIndex`). On series charts it
   * defaults the annotation's color to that series' color, and on grouped
   * bars it moves the annotation onto that sub-bar; elsewhere position is
   * unchanged. A `seriesIndex` naming no series on that chart drops the
   * annotation; charts without series drop any annotation carrying one.
   */
  seriesIndex?: number;
  /**
   * Interactivity (v2): only annotations with `interactive: true` appear
   * in `scene.annotationPoints` and get hit targets in the React wrappers.
   * Default off — annotations stay purely visual unless opted in.
   */
  interactive?: boolean;
  /** Accessible name for an interactive annotation (used as its aria-label). */
  label?: string;
}

/** An interactive annotation's hit entry, for the React wrappers. */
export interface SceneAnnotationPoint {
  /** Position in the input `annotations` array (gaps preserved on drops). */
  annotationIndex: number;
  x: number;
  y: number;
  label?: string;
  seriesIndex?: number;
}

/** Opt-in annotations, shared by every chart. Purely visual by default:
 * annotations are marks only, never `scene.points`, and never affect the
 * chart's scales, domains, or automatic padding. Out-of-range annotations
 * are dropped, not clamped to an edge. Interactive annotations (v2) appear
 * in `scene.annotationPoints`, never in `scene.points`. */
export interface AnnotationOptions {
  annotations?: Annotation[];
}

/**
 * One full-span reference line (v2), on the cartesian charts only (line,
 * area, lines, bar, scatter). `orientation: 'horizontal'` draws at
 * `y = value` spanning the plot width; `'vertical'` draws at `x = value`
 * spanning the plot height. The coordinate is read on the perpendicular
 * axis's scale (so on a horizontal bar chart a horizontal line's position
 * is a category index and a vertical line's is a value). Never rescales
 * the chart; an out-of-domain value is dropped, like an annotation.
 */
export interface ReferenceLine {
  value: number;
  orientation: 'horizontal' | 'vertical';
  color?: string;
  thickness?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

/** Opt-in reference lines, shared by the cartesian charts. */
export interface ReferenceLineOptions {
  referenceLines?: ReferenceLine[];
}

export type Padding = number | { top?: number; right?: number; bottom?: number; left?: number };

export interface BaseOptions {
  width?: number;
  height?: number;
  color?: string;
  padding?: Padding;
  title?: string;
  desc?: string;
  /** CSS class(es) assigned to the generated `<svg>` element, merged with the
   * built-in `nc-chart` class. Combine with the generated `nc-` mark classes
   * to style the chart and its components. */
  class?: string;
}
