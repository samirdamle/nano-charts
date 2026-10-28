import type { Mark, Scene, SceneAnnotationPoint, ScenePoint } from '../types';

/**
 * Shared chart epilogue: owns the two rules every chart's return used to
 * re-implement. Annotations sit on top of everything, so `annMarks` are
 * appended after the chart's own marks; and `annotationPoints` is present
 * only when at least one interactive annotation exists, so scenes without
 * interactive annotations are byte-identical to before. The order of the
 * chart's own layers (highlights, axes, data, reference lines) stays
 * chart-owned — it genuinely differs per chart family.
 */
export function finishScene(
  shell: Scene,
  marks: Mark[],
  points: ScenePoint[],
  annMarks: Mark[],
  annotationPoints: SceneAnnotationPoint[],
): Scene {
  return {
    ...shell,
    marks: [...marks, ...annMarks],
    points,
    ...(annotationPoints.length > 0 ? { annotationPoints } : {}),
  };
}
