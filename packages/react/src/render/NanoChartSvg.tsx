'use client';

import type { Scene } from '@samirdamle/nano-charts';
import type { Plots } from '@samirdamle/nano-charts';
import { useEffect } from 'react';
import { svgClass } from '@samirdamle/nano-charts';
import { Marks } from './Marks';
import { HitTargets } from './HitTargets';
import type { InteractionProps } from '../types';

export interface NanoChartSvgProps<P = Plots> extends InteractionProps<P> {
  scene: Scene;
}

export function NanoChartSvg<P = Plots>({
  scene,
  onPointHover,
  onPointClick,
  onAnnotationHover,
  onAnnotationClick,
  onPlots,
  className,
  style,
  hitRadius = 4,
}: NanoChartSvgProps<P>) {
  // Plots are delivered after mount, not during render, so a callback that
  // calls setState is safe. Fires only when the scene carries plots
  // (`plots: true`); the empty scene never does, so null data never fires.
  // The cast is safe by construction: each wrapper passes the plots type
  // of its own chart, and the core fn only ever attaches that payload.
  useEffect(() => {
    if (scene.plots !== undefined) onPlots?.(scene.plots as P);
  }, [scene.plots, onPlots]);
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
