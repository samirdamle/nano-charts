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
  a11y: { title: string; desc: string };
  /** Developer CSS class(es) for the `<svg>` element, from `BaseOptions.class`. */
  svgClass?: string;
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
