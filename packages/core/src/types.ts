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
  /** The plots payload, when `BaseOptions.plots` is true; absent otherwise. */
  plots?: Plots;
  a11y: { title: string; desc: string };
  /** Developer CSS class(es) for the `<svg>` element, from `BaseOptions.class`. */
  svgClass?: string;
}

/** Coordinate metadata that makes a plots payload self-contained: the chart
 * size, the data area (plot box) in pixels, and the data domains where the
 * chart has them. */
export interface PlotFrame {
  readonly width: number;
  readonly height: number;
  readonly plot: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Data domain on the x axis: a numeric range, or the category labels for
   * categorical charts. Absent where the chart has no x domain (dial charts:
   * donut, gauge). */
  readonly xDomain?: readonly [number, number] | readonly string[];
  /** Data domain on the y axis. Absent where the chart has no y domain. */
  readonly yDomain?: readonly [number, number];
}

/** One plotted point on a series chart (line, lines, area). `x`/`y` are
 * pixels; `value` is the datum; `color` is the series color its mark
 * renders with. */
export interface PlotsPoint {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly index: number;
  readonly seriesIndex?: number;
  readonly color: string;
}

/** One series' worth of plotted points. */
export interface PlotsSeries {
  readonly seriesIndex: number;
  readonly label?: string;
  readonly points: readonly PlotsPoint[];
}

export interface LinePlots {
  readonly kind: 'line';
  readonly frame: PlotFrame;
  readonly series: readonly PlotsSeries[];
}

export interface LinesPlots {
  readonly kind: 'lines';
  readonly frame: PlotFrame;
  readonly series: readonly PlotsSeries[];
}

export interface AreaPlots {
  readonly kind: 'area';
  readonly frame: PlotFrame;
  readonly series: readonly PlotsSeries[];
  /** Pixel y of the baseline the fill sits on. Absent when the series has no data. */
  readonly baselineY?: number;
}

/** One plotted scatter point: pixel `x`/`y` plus both data coordinates. */
export interface ScatterPlotsPoint {
  readonly x: number;
  readonly y: number;
  readonly valueX: number;
  readonly valueY: number;
  readonly index: number;
  readonly seriesIndex?: number;
  readonly color: string;
}

export interface ScatterPlotsSeries {
  readonly seriesIndex: number;
  readonly label?: string;
  readonly points: readonly ScatterPlotsPoint[];
}

export interface ScatterPlots {
  readonly kind: 'scatter';
  readonly frame: PlotFrame;
  readonly series: readonly ScatterPlotsSeries[];
}

/** One bar: its rect in pixels, its value, and the series it belongs to.
 * `from` is present for waterfall segments only: the segment's start value
 * (its `value` is the end). */
export interface BarPlotsBar {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly value: number;
  readonly from?: number;
  readonly index: number;
  readonly seriesIndex?: number;
  readonly color: string;
}

export interface BarPlots {
  readonly kind: 'bar';
  readonly frame: PlotFrame;
  readonly bars: readonly BarPlotsBar[];
}

/** One donut segment. Angles are degrees, 0° = east, clockwise positive
 * (the gauge's convention). */
export interface DonutPlotsSegment {
  readonly value: number;
  readonly fraction: number;
  /** Segment angles in degrees, 0° = east, clockwise positive — the shared dial convention. */
  readonly startAngle: number;
  readonly endAngle: number;
  readonly index: number;
  readonly label?: string;
  readonly color: string;
}

export interface DonutPlots {
  readonly kind: 'donut';
  readonly frame: PlotFrame;
  readonly segments: readonly DonutPlotsSegment[];
  readonly center: { readonly x: number; readonly y: number };
  readonly innerRadius: number;
  readonly outerRadius: number;
}

/** One gauge zone, with both ends explicit (`from` is the previous zone's
 * `to`, or `min` for the first). */
export interface GaugePlotsZone {
  readonly from: number;
  readonly to: number;
  readonly color: string;
}

export interface GaugePlots {
  readonly kind: 'gauge';
  readonly frame: PlotFrame;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly frac: number;
  /** Dial start in degrees, 0° = east, clockwise positive. */
  readonly startAngle: number;
  /** Dial end in degrees. */
  readonly endAngle: number;
  /** Needle angle in degrees. Present in needle mode only. */
  readonly needleAngle?: number;
  readonly zones: readonly GaugePlotsZone[];
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
}

/** One bullet range band: its data span and its pixel extent. */
export interface BulletPlotsRange {
  readonly from: number;
  readonly to: number;
  readonly x: number;
  readonly width: number;
  readonly color: string;
}

export interface BulletPlots {
  readonly kind: 'bullet';
  readonly frame: PlotFrame;
  readonly ranges: readonly BulletPlotsRange[];
  readonly value: { readonly value: number; readonly x: number; readonly width: number; readonly color: string };
  readonly target: { readonly value: number; readonly x: number; readonly color: string };
  readonly max: number;
}

/** One heatmap cell: its grid position, its value, and its rect in pixels.
 * `color` is the color-scale output for the value. */
export interface HeatmapPlotsCell {
  readonly row: number;
  readonly col: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

export interface HeatmapPlots {
  readonly kind: 'heatmap';
  readonly frame: PlotFrame;
  readonly cells: readonly HeatmapPlotsCell[];
}

/** One radar vertex: the axis it sits on, its value, and its pixel
 * position. */
export interface RadarPlotsVertex {
  readonly axis: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly seriesIndex?: number;
  readonly color: string;
}

export interface RadarPlotsSeries {
  readonly seriesIndex: number;
  readonly label?: string;
  readonly vertices: readonly RadarPlotsVertex[];
}

export interface RadarPlots {
  readonly kind: 'radar';
  readonly frame: PlotFrame;
  readonly series: readonly RadarPlotsSeries[];
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
}

/** One pictogram block: its series, its 1-based position within the
 * series, and its pixel position and size. `color` is the resolved main
 * color (before variant mapping). */
export interface PictogramPlotsBlock {
  readonly series: number;
  readonly blockNumber: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly filled: boolean;
  readonly empty: boolean;
  readonly partial: boolean;
  readonly color: string;
}

/** One connector line between pictogram block centers, in pixels. */
export interface PictogramPlotsConnector {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface PictogramPlots {
  readonly kind: 'pictogram';
  readonly frame: PlotFrame;
  readonly blocks: readonly PictogramPlotsBlock[];
  readonly connectors?: readonly PictogramPlotsConnector[];
}

/** One win/loss block. `sign` is `'up'` for a positive value, `'down'` for
 * a negative one, `'flat'` for zero. */
export interface WinLossPlotsBlock {
  readonly index: number;
  readonly value: number;
  readonly sign: 'up' | 'down' | 'flat';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

export interface WinLossPlots {
  readonly kind: 'winLoss';
  readonly frame: PlotFrame;
  readonly blocks: readonly WinLossPlotsBlock[];
}

/**
 * The plots payload: a chart's computed geometry in data form (#216).
 * Present on `Scene.plots` only when `BaseOptions.plots` is true; absent
 * otherwise, so scenes with the option off are byte-identical to before.
 * Geometry is in pixels, each element carrying its datum identity and its
 * resolved `color` (the color its mark renders with); `frame` carries the
 * coordinate metadata. Plain JSON-serializable values only; treat as
 * read-only — mutating it has no effect on the rendered SVG.
 */
export type Plots =
  | LinePlots
  | LinesPlots
  | AreaPlots
  | ScatterPlots
  | BarPlots
  | DonutPlots
  | GaugePlots
  | BulletPlots
  | HeatmapPlots
  | RadarPlots
  | PictogramPlots
  | WinLossPlots;

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
  /** Per-chart coordinates. A chart that ignores a coordinate (donut
   * ignores `x`; bullet and win-loss ignore `y`) accepts its omission; an
   * annotation missing a coordinate its chart needs is dropped, never
   * throwing. */
  x?: number;
  y?: number;
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
  /** Return the plots — the chart's computed geometry in data form — on
   * `Scene.plots` (#216). Off by default; when off the key is absent and
   * the scene is byte-identical to before. */
  plots?: boolean;
}
