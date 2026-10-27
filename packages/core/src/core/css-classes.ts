/**
 * Generated CSS classes. Every mark nano-charts renders carries semantic
 * classes so developers can style charts with plain CSS:
 *
 * - `nc-chart` on the `<svg>` root (plus any developer `class` option).
 * - One kind class per mark: `nc-point`, `nc-bar`, `nc-segment`, `nc-block`, …
 * - An indexed class alongside it: `nc-point-3`, `nc-bar-2`, …
 * - `nc-series-{i}` on marks that belong to a series (mirrors `data-series`).
 *
 * Indexes mirror the `data-index` attributes the renderers already emit, so
 * classes and data attributes tell the same story. Kinds are chart-agnostic
 * (no chart abbreviation) — per-chart scoping comes from the svg-level class,
 * e.g. `.revenue .nc-point { fill: gold }`.
 */

/** Semantic mark kinds for generated CSS classes. */
export type MarkKind =
  | 'point'
  | 'line'
  | 'area'
  | 'bar'
  | 'segment'
  | 'block'
  | 'cell'
  | 'connector'
  | 'track'
  | 'gridline'
  | 'axis'
  | 'tick'
  | 'label'
  | 'highlight'
  | 'zone'
  | 'annotation'
  | 'reference-line'
  | 'arc'
  | 'needle'
  | 'hub'
  | 'range'
  | 'target'
  | 'spoke'
  | 'ring';

/**
 * Compose the generated class string for a mark: the kind class, then
 * `nc-series-{seriesIndex}` when the mark belongs to a series, then the
 * indexed kind class. `extra` appends verbatim classes (e.g. orientation or
 * state qualifiers like `nc-axis-x` or `nc-filled`).
 *
 * @example markClass('point', 3) // 'nc-point nc-point-3'
 * @example markClass('point', 3, 1) // 'nc-point nc-series-1 nc-point-3'
 */
export function markClass(kind: MarkKind, index?: number, seriesIndex?: number, extra?: string): string {
  const parts = [`nc-${kind}`];
  if (seriesIndex !== undefined) parts.push(`nc-series-${seriesIndex}`);
  if (index !== undefined) parts.push(`nc-${kind}-${index}`);
  if (extra) parts.push(extra);
  return parts.join(' ');
}

/**
 * Compose the `<svg>` root class: the built-in `nc-chart`, the scene's
 * developer class (from the chart `class` option), and the render call's
 * class (`toSVG`'s `className` opt or React's `className` prop).
 */
export function svgClass(sceneClass?: string, renderClass?: string): string {
  return ['nc-chart', sceneClass, renderClass].filter(Boolean).join(' ');
}
