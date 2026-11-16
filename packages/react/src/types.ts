import type { CSSProperties } from 'react';
import type { Plots, SceneAnnotationPoint, ScenePoint } from '@samirdamle/nano-charts';

/** Interaction props shared by every `…NanoChart` wrapper. `P` is the
 * chart's plots payload, so each wrapper's `onPlots` is typed to its own
 * chart; it defaults to the `Plots` union. */
export interface InteractionProps<P = Plots> {
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
  /** Hover/click for interactive annotations only (`interactive: true`). */
  onAnnotationHover?: (point: SceneAnnotationPoint | null) => void;
  onAnnotationClick?: (point: SceneAnnotationPoint) => void;
  /** Fired with the chart's plots when they were computed (`plots: true`).
   * Not fired otherwise — including for null/undefined data, which renders
   * the hand-built empty scene. Fires after mount (an effect), so calling
   * setState in the callback is safe. */
  onPlots?: (plots: P) => void;
  className?: string;
  style?: CSSProperties;
  hitRadius?: number;
}
