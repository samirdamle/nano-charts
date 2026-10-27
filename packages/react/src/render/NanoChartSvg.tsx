'use client';

import type { Scene } from '@samirdamle/nano-charts';
import { svgClass } from '@samirdamle/nano-charts';
import { Marks } from './Marks';
import { PointHitTargets } from './PointHitTargets';
import { AnnotationHitTargets } from './AnnotationHitTargets';
import type { InteractionProps } from '../types';

export interface NanoChartSvgProps extends InteractionProps {
  scene: Scene;
}

export function NanoChartSvg({
  scene,
  onPointHover,
  onPointClick,
  onAnnotationHover,
  onAnnotationClick,
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
      className={svgClass(scene.svgClass, className)}
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
      <AnnotationHitTargets
        points={scene.annotationPoints ?? []}
        hitRadius={hitRadius}
        onAnnotationHover={onAnnotationHover}
        onAnnotationClick={onAnnotationClick}
      />
    </svg>
  );
}
