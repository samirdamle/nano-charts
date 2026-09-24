import type { ScenePoint } from '@samirdamle/nano-charts';

export interface PointHitTargetsProps {
  points: ScenePoint[];
  hitRadius: number;
  onPointHover?: (point: ScenePoint | null) => void;
  onPointClick?: (point: ScenePoint) => void;
}

export function PointHitTargets({
  points,
  hitRadius,
  onPointHover,
  onPointClick,
}: PointHitTargetsProps) {
  if (!onPointHover && !onPointClick) return null;
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
          onMouseEnter={onPointHover ? () => onPointHover(point) : undefined}
          onMouseLeave={onPointHover ? () => onPointHover(null) : undefined}
          onClick={onPointClick ? () => onPointClick(point) : undefined}
        />
      ))}
    </>
  );
}
