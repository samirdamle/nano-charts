'use client';

import type { Scene } from '@samirdamle/nano-charts';
import { Marks } from './Marks';
import { PointHitTargets } from './PointHitTargets';
import type { InteractionProps } from '../types';

export interface ChartSvgProps extends InteractionProps {
  scene: Scene;
}

export function ChartSvg({ scene, onPointHover, onPointClick, className, style, hitRadius = 4 }: ChartSvgProps) {
  return (
    <svg
      viewBox={scene.viewBox}
      role="img"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      style={style}
    >
      <title>{scene.a11y.title}</title>
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
