'use client';

import type { Scene } from '@samirdamle/nano-charts';
import { svgClass } from '@samirdamle/nano-charts';
import { Marks } from './Marks';
import { HitTargets } from './HitTargets';
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
      <HitTargets
        points={scene.points}
        hitRadius={hitRadius}
        onHover={onPointHover}
        onClick={onPointClick}
      />
      <HitTargets
        points={scene.annotationPoints ?? []}
        hitRadius={hitRadius}
        onHover={onAnnotationHover}
        onClick={onAnnotationClick}
        getAriaLabel={(point) => point.label}
      />
    </svg>
  );
}
