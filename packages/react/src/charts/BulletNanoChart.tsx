'use client';

import { bullet, type BulletOptions, type BulletData } from '@samirdamle/nano-charts';
import { renderNanoChart } from '../render/renderNanoChart';
import type { InteractionProps } from '../types';

export interface BulletNanoChartProps extends BulletOptions, InteractionProps {
  data: BulletData;
}

export function BulletNanoChart({ data, ...rest }: BulletNanoChartProps): JSX.Element {
  // Explicit type arguments: the overloaded core fn can't carry the options
  // type through inference, so pin D and O here.
  return renderNanoChart<BulletData, BulletOptions>(bullet, data, rest);
}
