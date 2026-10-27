import type { CSSProperties } from 'react';
import type { SceneAnnotationPoint, ScenePoint } from '@samirdamle/nano-charts';

export interface InteractionProps {
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
  /** Hover/click for interactive annotations only (`interactive: true`). */
  onAnnotationHover?: (point: SceneAnnotationPoint | null) => void;
  onAnnotationClick?: (point: SceneAnnotationPoint) => void;
  className?: string;
  style?: CSSProperties;
  hitRadius?: number;
}
