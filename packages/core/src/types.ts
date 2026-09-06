export type Datum = {
  id: string | number;
  label: string;
  value: number;
  index: number;
  color?: string;
};

export type Mark =
  | {
      type: 'polyline';
      points: [number, number][];
      stroke?: string;
      strokeWidth?: number;
      fill?: 'none';
      strokeDasharray?: string;
      strokeLinecap?: 'butt' | 'round' | 'square';
    }
  | {
      type: 'path';
      d: string;
      fill?: string;
      fillOpacity?: number;
      stroke?: string;
      strokeWidth?: number;
      strokeOpacity?: number;
    }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill?: string; fillOpacity?: number; rx?: number }
  | {
      type: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      index?: number;
      seriesIndex?: number;
    }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number };

export interface ScenePoint {
  id: string | number;
  label: string;
  value: number;
  index: number;
  x: number;
  y: number;
  row?: number;
  col?: number;
  w?: number;
  h?: number;
  seriesIndex?: number;
  seriesLabel?: string;
}

export interface Scene {
  width: number;
  height: number;
  viewBox: string;
  marks: Mark[];
  points: ScenePoint[];
  a11y: { title: string; desc: string };
}

export type Padding = number | { top?: number; right?: number; bottom?: number; left?: number };

export interface BaseOptions {
  width?: number;
  height?: number;
  color?: string;
  padding?: Padding;
  title?: string;
  desc?: string;
}
