export interface HitTargetsProps<T extends { x: number; y: number }> {
  points: T[];
  hitRadius: number;
  onHover?: (point: T | null) => void;
  onClick?: (point: T) => void;
  /**
   * Accessible name for a circle. Data points pass none, so their circles
   * stay unnamed; interactive annotations pass `(point) => point.label`, so
   * a labeled annotation's circle carries its label and an unlabeled one
   * stays unnamed. React omits `aria-label` when this returns undefined.
   */
  getAriaLabel?: (point: T) => string | undefined;
}

/**
 * Invisible hit targets shared by data points and interactive annotations:
 * one transparent circle per point, same `hitRadius` (default 4), same
 * hover-null-on-leave contract. Renders nothing when neither handler is set.
 */
export function HitTargets<T extends { x: number; y: number }>({
  points,
  hitRadius,
  onHover,
  onClick,
  getAriaLabel,
}: HitTargetsProps<T>) {
  if (!onHover && !onClick) return null;
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
          aria-label={getAriaLabel?.(point)}
          onMouseEnter={onHover ? () => onHover(point) : undefined}
          onMouseLeave={onHover ? () => onHover(null) : undefined}
          onClick={onClick ? () => onClick(point) : undefined}
        />
      ))}
    </>
  );
}
