import type { AnnotationOptions, BaseOptions, Mark, Scene, ScenePoint } from '../types';
import { round, toDasharray } from '../core/geometry';
import { normalizeSeries, type SeriesAccessors, type SeriesInput } from '../core/normalize';
import { resolveSegmentColor } from '../core/palette';
import { resolveChartShell, sceneShell, singlePointDot } from '../core/series-chart';
import { markClass } from '../core/css-classes';
import { annotationMarks, radarAnnotationMapper, seriesAwareMapper } from '../core/annotations';

export interface RadarSeries<T = number> extends Partial<SeriesAccessors<T>> {
  data: SeriesInput<T>;
  /** Series display name, carried onto its points as `seriesLabel`. */
  name?: string;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** Polygon fill: `true`/omitted → 0.2 opacity, `false` → no fill, number → opacity. */
  fill?: boolean | number;
  dot?: 'none' | 'all';
  dotRadius?: number;
}

// A non-empty array whose first element is an object with an array-valued
// `data` field is a series array; anything else is shorthand for one series.
function isSeriesArray<T>(input: RadarInput<T>): input is RadarSeries<T>[] {
  if (input.length === 0) return true; // either way: empty scene
  const first = input[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    'data' in first &&
    Array.isArray((first as { data: unknown }).data)
  );
}

export type RadarInput<T = number> = SeriesInput<T> | RadarSeries<T>[];

export interface RadarOptions extends BaseOptions, AnnotationOptions {
  /** Domain ceiling; defaults to the largest value across all series. */
  max?: number;
  /** Decorative spider grid (spokes + rings). Default true. */
  grid?: boolean;
  /** Grid stroke color. Defaults to the chart color (`currentColor` when unset). */
  gridColor?: string;
  /** Grid stroke opacity, 0–1. Defaults to 0.15. */
  gridOpacity?: number;
}

const TAU = Math.PI * 2;

function polarRad(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [round(cx + radius * Math.cos(angle)), round(cy + radius * Math.sin(angle))];
}

export function radar<T = number>(
  input: RadarInput<T>,
  options: RadarOptions & Partial<SeriesAccessors<T>> = {},
): Scene {
  const {
    width,
    height,
    color: defaultColor,
    padding,
  } = resolveChartShell({
    width: 100,
    height: 100,
    ...options,
  });
  const seriesList: RadarSeries<T>[] = isSeriesArray(input)
    ? input
    : [{ data: input, value: options.value, label: options.label, id: options.id }];
  const hasUniformColor = options.color !== undefined;

  const perSeries = seriesList.map((s) => {
    const accessors = s.value ? { value: s.value, label: s.label, id: s.id } : undefined;
    return { input: s, datums: normalizeSeries(s.data, accessors) };
  });

  const axisCount = perSeries.length ? Math.max(...perSeries.map((s) => s.datums.length)) : 0;
  const title = options.title ?? 'radar chart';
  const desc =
    options.desc ??
    (axisCount === 0
      ? 'radar chart, no data'
      : `radar chart, ${perSeries.length} series, ${axisCount} axes`);
  const base = sceneShell({ width, height }, { title, desc }, options);
  if (axisCount === 0) return base;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(
    0,
    Math.min(width - padding.left - padding.right, height - padding.top - padding.bottom) / 2,
  );
  const startAngle = -Math.PI / 2;
  const angleAt = (i: number) => startAngle + (i * TAU) / axisCount;

  // Clamp policy: non-finite values become 0 and negatives can't produce a
  // negative radius — both are treated as zero for the layout math. Points
  // keep the raw values (datum identity for tooltips).
  const clamped = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  const dataMax = Math.max(0, ...perSeries.flatMap((s) => s.datums.map((d) => clamped(d.value))));
  // An explicit max extends the domain ceiling; a non-finite or non-positive
  // max can't serve as a ceiling, so it falls back to the data max. Geometry
  // is clamped into [0, max] so an explicit max smaller than a value keeps
  // the polygon inside the scene.
  const domainMax =
    options.max !== undefined && Number.isFinite(options.max) && options.max > 0
      ? options.max
      : dataMax;
  const scale = (v: number) =>
    domainMax === 0 ? 0 : (Math.min(clamped(v), domainMax) / domainMax) * radius;

  const marks: Mark[] = [];
  const points: ScenePoint[] = [];

  // Decorative spider grid: spokes plus concentric rings at quarter steps.
  // Drawn as paths so the stroke can be translucent.
  if (options.grid ?? true) {
    const gridStroke = options.gridColor ?? defaultColor;
    const gridOpacity =
      options.gridOpacity !== undefined &&
      Number.isFinite(options.gridOpacity) &&
      options.gridOpacity >= 0
        ? Math.min(options.gridOpacity, 1)
        : 0.15;
    for (let i = 0; i < axisCount; i++) {
      const [x, y] = polarRad(cx, cy, radius, angleAt(i));
      marks.push({
        type: 'path',
        class: markClass('spoke', i),
        d: `M${round(cx)},${round(cy)} L${x},${y}`,
        fill: 'none',
        stroke: gridStroke,
        strokeWidth: 0.5,
        strokeOpacity: gridOpacity,
      });
    }
    for (const [ri, frac] of [0.25, 0.5, 0.75, 1].entries()) {
      const ring: [number, number][] = [];
      for (let i = 0; i < axisCount; i++) ring.push(polarRad(cx, cy, radius * frac, angleAt(i)));
      const d = ring.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
      marks.push({
        type: 'path',
        class: markClass('ring', ri),
        d,
        fill: 'none',
        stroke: gridStroke,
        strokeWidth: 0.5,
        strokeOpacity: gridOpacity,
      });
    }
  }

  const seriesColors: string[] = [];

  perSeries.forEach(({ input: s, datums }, seriesIndex) => {
    // Precedence: explicit per-series color > uniform options.color (only if
    // the caller passed it) > categorical palette. Same rule lines() uses.
    const color = resolveSegmentColor({
      explicit: s.color,
      uniform: defaultColor,
      usePalette: !hasUniformColor,
      paletteIndex: seriesIndex,
      paletteTotal: perSeries.length,
    });
    seriesColors.push(color);
    const strokeWidth = s.strokeWidth ?? 1;
    const strokeDasharray = toDasharray(s.strokeDasharray);
    const vertex = (i: number): [number, number] => {
      const d = datums[i];
      return polarRad(cx, cy, scale(d ? d.value : 0), angleAt(i));
    };

    const seriesPoints: ScenePoint[] = [];
    for (let i = 0; i < axisCount; i++) {
      const d = datums[i];
      const [x, y] = vertex(i);
      seriesPoints.push({
        id: d?.id ?? `${seriesIndex}:${i}`,
        label: d?.label ?? String(d?.value ?? 0),
        value: d?.value ?? 0,
        index: i,
        x,
        y,
        seriesIndex,
        seriesLabel: s.name,
      });
    }

    if (axisCount === 1) {
      marks.push(
        singlePointDot(seriesPoints[0]!, Math.max(s.dotRadius ?? 1, strokeWidth + 0.5), color, {
          index: points.length,
          seriesIndex,
          class: markClass('point', points.length, seriesIndex),
        }),
      );
    } else {
      const closed = [
        ...seriesPoints.map((p) => [p.x, p.y] as [number, number]),
        [seriesPoints[0]!.x, seriesPoints[0]!.y] as [number, number],
      ];
      if (s.fill !== false) {
        const opacity = typeof s.fill === 'number' ? s.fill : 0.2;
        const d = closed.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
        marks.push({
          type: 'path',
          class: markClass('area', undefined, seriesIndex),
          d,
          fill: color,
          fillOpacity: opacity,
          stroke: 'none',
        });
      }
      marks.push({
        type: 'polyline',
        class: markClass('line', undefined, seriesIndex),
        points: closed,
        fill: 'none',
        stroke: color,
        strokeWidth,
        strokeDasharray,
        strokeLinecap: s.strokeLinecap,
      });
      if (s.dot === 'all') {
        for (let i = 0; i < seriesPoints.length; i++) {
          const p = seriesPoints[i]!;
          marks.push({
            type: 'circle',
            class: markClass('point', points.length + i, seriesIndex),
            cx: p.x,
            cy: p.y,
            r: s.dotRadius ?? 1,
            fill: color,
            index: points.length + i,
            seriesIndex,
          });
        }
      }
    }

    points.push(...seriesPoints);
  });

  // Annotations sit on top of everything, at the polar point for their
  // axis/value — regardless of the drawn polygons. Series targeting colors
  // by series but never moves the mark: the domain is shared.
  const { marks: annMarks, annotationPoints } = annotationMarks(
    options.annotations,
    seriesAwareMapper(
      radarAnnotationMapper(cx, cy, radius, axisCount, domainMax),
      perSeries.length,
      (si) => seriesColors[si],
    ),
    defaultColor,
  );

  return {
    ...base,
    marks: [...marks, ...annMarks],
    points,
    ...(annotationPoints.length > 0 ? { annotationPoints } : {}),
  };
}
