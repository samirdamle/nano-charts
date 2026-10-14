'use client';

import { bullet, type BulletOptions, type BulletData } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface BulletNanoChartProps extends BulletOptions, InteractionProps {
  data: BulletData;
}

export function BulletNanoChart({ data, ...rest }: BulletNanoChartProps): JSX.Element {
  return renderNanoChart(bullet, data, rest);
}
