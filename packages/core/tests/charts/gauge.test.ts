import { describe, it, expect } from 'vitest';
import { gauge } from '../../src/charts/gauge';
import { polar, round } from '../../src/core/geometry';

const paths = (scene: ReturnType<typeof gauge>) =>
  scene.marks.filter((m) => m.type === 'path');
const startOf = (d: string) => d.split(' ')[0]!.slice(1); // strip leading "M"
const endOf = (d: string) => d.split(' ').pop()!;
const pt = (deg: number) => {
  const [x, y] = polar(10, 10, 8.25, deg);
  return `${round(x)},${round(y)}`;
};

describe('gauge (defaults)', () => {
  it('draws a 270° dial from 135° by default', () => {
    const scene = gauge({ value: 50, max: 100 });
    const track = paths(scene)[0]!;
    expect(startOf(track.d)).toBe(pt(135));
    expect(endOf(track.d)).toBe(pt(405));
  });

  it('arc mode draws track + value arc, value arc ending at the value angle', () => {
    const scene = gauge({ value: 50, max: 100 });
    expect(paths(scene)).toHaveLength(2);
    const valueArc = paths(scene)[1]!;
    // frac 0.5 across 270° → ends at 270° (top)
    expect(startOf(valueArc.d)).toBe(pt(135));
    expect(endOf(valueArc.d)).toBe(pt(270));
    expect(valueArc).toMatchObject({ fill: 'none' });
  });

  it('is a square 20x20 chart with an accessible name', () => {
    const scene = gauge({ value: 75, max: 100 });
    expect(scene.width).toBe(20);
    expect(scene.height).toBe(20);
    expect(scene.a11y.title).toBe('gauge chart');
    expect(scene.a11y.desc).toContain('75');
  });

  it('emits one center point with a percent label', () => {
    const scene = gauge({ value: 75, max: 100 });
    expect(scene.points).toHaveLength(1);
    expect(scene.points[0]).toMatchObject({ label: '75%', value: 75, x: 10, y: 10 });
  });
});

describe('gauge (domain)', () => {
  it('maps value across [min, max]', () => {
    const scene = gauge({ value: 75, max: 150 }, { min: 50 });
    // frac = (75-50)/(150-50) = 0.25 → 135 + 67.5 = 202.5°
    expect(endOf(paths(scene)[1]!.d)).toBe(pt(202.5));
  });

  it('clamps out-of-range values to the dial ends', () => {
    const over = gauge({ value: 999, max: 100 });
    expect(endOf(paths(over)[1]!.d)).toBe(pt(405));
    const under = gauge({ value: -5, max: 100 });
    // frac 0 → no value arc at all
    expect(paths(under)).toHaveLength(1);
  });

  it('pins a bad domain at the dial start but still renders the dial', () => {
    const scene = gauge({ value: 50, max: 0 });
    expect(paths(scene)).toHaveLength(1); // track only, no value arc
    expect(scene.points[0]!.label).toBe('0%');
  });

  it('supports a full-circle dial via explicit angles', () => {
    const scene = gauge({ value: 100, max: 100 }, { startAngle: 0, endAngle: 360 });
    const track = paths(scene)[0]!;
    expect(startOf(track.d)).toBe(pt(0));
    expect(endOf(track.d)).toBe(pt(360));
  });

  it('falls back to the 270° dial on a bad endAngle', () => {
    const scene = gauge({ value: 50, max: 100 }, { endAngle: 45 });
    expect(endOf(paths(scene)[0]!.d)).toBe(pt(405));
  });
});

describe('gauge (needle mode)', () => {
  const zones = [
    { to: 60, color: 'green' },
    { to: 80, color: 'yellow' },
    { to: 100, color: 'red' },
  ];

  it('draws one arc per zone with the zone colors', () => {
    const scene = gauge({ value: 70, max: 100 }, { mode: 'needle', zones });
    const zoneArcs = paths(scene).filter((p) => !p.d.endsWith('Z'));
    expect(zoneArcs).toHaveLength(3);
    expect(zoneArcs.map((p) => p.stroke)).toEqual(['green', 'yellow', 'red']);
    // first zone starts at the dial start, last ends at the dial end
    expect(startOf(zoneArcs[0]!.d)).toBe(pt(135));
    expect(endOf(zoneArcs[2]!.d)).toBe(pt(405));
  });

  it('draws a triangle needle pointing at the value angle plus a hub', () => {
    const scene = gauge({ value: 70, max: 100 }, { mode: 'needle', zones });
    const needle = paths(scene).find((p) => p.d.endsWith('Z'))!;
    expect(needle).toBeDefined();
    expect(needle.fill).toBeTruthy();
    expect(needle.stroke).toBe('none');
    // tip is the first moveto: 70% → 135 + 0.7*270 = 324°
    expect(needle.d.startsWith(`M${pt(324)}`)).toBe(true);
    const hub = scene.marks.find((m) => m.type === 'circle')!;
    expect(hub).toMatchObject({ cx: 10, cy: 10 });
  });

  it('draws a line needle ending at the pivot center', () => {
    const scene = gauge({ value: 50, max: 100 }, { mode: 'needle', needle: 'line', zones });
    const line = scene.marks.find((m) => m.type === 'line')!;
    // tip at 270°, base at the pivot center so nothing juts out past the hub
    expect(line).toMatchObject({ x1: 10, y1: 10, x2: 10, y2: 1.75 });
    expect(line.strokeWidth).toBeGreaterThan(0);
  });

  it('falls back to the track dial when needle mode has no zones', () => {
    const scene = gauge({ value: 50, max: 100 }, { mode: 'needle' });
    expect(paths(scene)).toHaveLength(2); // track + triangle needle (a path)
    expect(scene.marks.some((m) => m.type === 'circle')).toBe(true); // hub
  });

  it('clamps zone bands into [min, max] and skips empty ones', () => {
    const scene = gauge(
      { value: 10, max: 100 },
      { mode: 'needle', zones: [{ to: -5, color: 'green' }, { to: 200, color: 'red' }] },
    );
    const zoneArcs = paths(scene).filter((p) => p.stroke !== 'none');
    // negative zone skipped; overshooting zone clamped to the full dial
    expect(zoneArcs).toHaveLength(1);
    expect(zoneArcs[0]!.stroke).toBe('red');
    expect(startOf(zoneArcs[0]!.d)).toBe(pt(135));
    expect(endOf(zoneArcs[0]!.d)).toBe(pt(405));
  });
});

describe('gauge (zones in arc mode)', () => {
  it('renders zone bands as the background with the value arc sweeping over them', () => {
    const scene = gauge(
      { value: 70, max: 100 },
      { zones: [{ to: 60, color: 'green' }, { to: 100, color: 'red' }] },
    );
    const all = paths(scene);
    expect(all).toHaveLength(3); // 2 zones + value arc
    expect(all[2]!.stroke).not.toBe('green');
    expect(all[2]!.stroke).not.toBe('red');
    expect(endOf(all[2]!.d)).toBe(pt(135 + 0.7 * 270));
  });

  it('gives zone bands the same line caps as the value arc', () => {
    const scene = gauge(
      { value: 70, max: 100 },
      { zones: [{ to: 60, color: 'green' }, { to: 100, color: 'red' }], strokeLinecap: 'round' },
    );
    const zoneArcs = paths(scene).slice(0, 2);
    expect(zoneArcs.every((p) => p.strokeLinecap === 'round')).toBe(true);
  });

  it('leaves zone bands butt-capped when no line cap is set', () => {
    const scene = gauge(
      { value: 70, max: 100 },
      { zones: [{ to: 60, color: 'green' }, { to: 100, color: 'red' }] },
    );
    const zoneArcs = paths(scene).slice(0, 2);
    expect(zoneArcs.every((p) => p.strokeLinecap === undefined)).toBe(true);
  });

  it('dims zone bands when a zone opacity is given', () => {
    const scene = gauge(
      { value: 70, max: 100 },
      { zones: [{ to: 100, color: 'red', opacity: 0.3 }] },
    );
    expect(paths(scene)[0]).toMatchObject({ strokeOpacity: 0.3 });
  });

  it('leaves zone bands fully opaque by default', () => {
    const scene = gauge({ value: 70, max: 100 }, { zones: [{ to: 100, color: 'red' }] });
    expect(paths(scene)[0]!.strokeOpacity).toBeUndefined();
  });
});

describe('gauge (centerLabel)', () => {
  it('renders a literal string centered in arc mode', () => {
    const scene = gauge({ value: 72, max: 100 }, { centerLabel: '72%' });
    const label = scene.marks.find((m) => m.type === 'text')!;
    expect(label).toMatchObject({ x: 10, fontSize: 3, fontWeight: 600, text: '72%', textAnchor: 'middle' });
    expect(label.y).toBe(11.05); // cy + fontSize(3) * 0.35 baseline nudge
  });

  it('passes { value, min, max, frac } to a formatter', () => {
    const seen: unknown[] = [];
    gauge(
      { value: 75, max: 150 },
      { min: 50, centerLabel: (ctx) => (seen.push({ ...ctx }), `${ctx.value}/${ctx.max}`) },
    );
    expect(seen).toEqual([{ value: 75, min: 50, max: 150, frac: 0.25 }]);
  });

  it('sits below center in needle mode, clear of the hub', () => {
    const scene = gauge({ value: 50, max: 100 }, { mode: 'needle', centerLabel: '50%' });
    const label = scene.marks.find((m) => m.type === 'text')!;
    expect(label.y).toBeGreaterThan(10);
  });

  it('omits the label by default', () => {
    expect(gauge({ value: 50, max: 100 }).marks.some((m) => m.type === 'text')).toBe(false);
  });
});

describe('gauge (track)', () => {
  it('renders the track at the default 25% opacity', () => {
    const scene = gauge({ value: 50, max: 100 });
    expect(paths(scene)[0]).toMatchObject({ strokeOpacity: 0.25 });
  });

  it('hides the track with track: false', () => {
    const scene = gauge({ value: 50, max: 100 }, { track: false });
    expect(paths(scene)).toHaveLength(1); // value arc only
  });

  it('customizes the track ring', () => {
    const scene = gauge({ value: 50, max: 100 }, { track: { color: '#eee', opacity: 0.5 } });
    expect(paths(scene)[0]).toMatchObject({ stroke: '#eee', strokeOpacity: 0.5 });
  });
});
