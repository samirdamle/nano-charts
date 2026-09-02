import type { CSSProperties } from 'react';
import type { ScenePoint } from '@samirdamle/nano-charts';

export interface InteractionProps {
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
  className?: string;
  style?: CSSProperties;
  hitRadius?: number;
}
