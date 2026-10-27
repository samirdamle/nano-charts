import type { SceneAnnotationPoint } from '@samirdamle/nano-charts';

export interface AnnotationHitTargetsProps {
  points: SceneAnnotationPoint[];
  hitRadius: number;
  onAnnotationHover?: (point: SceneAnnotationPoint | null) => void;
  onAnnotationClick?: (point: SceneAnnotationPoint) => void;
}

/**
 * Invisible hit targets for interactive annotations, mirroring
 * PointHitTargets: same `hitRadius` (default 4), same hover-null-on-leave
 * contract. An annotation's `label`, when set, is the circle's accessible
 * name; without one the circle stays unnamed, like a data point.
 */
export function AnnotationHitTargets({
  points,
  hitRadius,
  onAnnotationHover,
  onAnnotationClick,
}: AnnotationHitTargetsProps) {
  if (!onAnnotationHover && !onAnnotationClick) return null;
  return (
    <>
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={hitRadius}
          fill="transparent"
          stroke="none"
          aria-label={point.label}
          onMouseEnter={onAnnotationHover ? () => onAnnotationHover(point) : undefined}
          onMouseLeave={onAnnotationHover ? () => onAnnotationHover(null) : undefined}
          onClick={onAnnotationClick ? () => onAnnotationClick(point) : undefined}
        />
      ))}
    </>
  );
}
