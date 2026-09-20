import { round } from './geometry';

export function categoricalColor(index: number, total: number): string {
  const hue = round((index * 360) / total);
  const lightness = index % 2 === 0 ? 30 : 70;
  return `hsl(${hue}, 60%, ${lightness}%)`;
}
