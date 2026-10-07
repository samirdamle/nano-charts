'use client';

import type { Scene } from '@samirdamle/nano-charts';
import { Marks } from './Marks';
import { PointHitTargets } from './PointHitTargets';
import type { InteractionProps } from '../types';

export interface NanoChartSvgProps extends InteractionProps {
  scene: Scene;
}

export function NanoChartSvg({
  scene,
  onPointHover,
  onPointClick,
  className,
  style,
  hitRadius = 4,
}: NanoChartSvgProps) {
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      aria-label={scene.a11y.title}
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <desc>{scene.a11y.desc}</desc>
      <Marks marks={scene.marks} />
      <PointHitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />
    </svg>
  );
}
