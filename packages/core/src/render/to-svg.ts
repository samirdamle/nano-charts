import type { Mark, Scene } from '../types';

/** Escape text content and attribute values. Covers the five XML significant chars,
 * so the result is safe both between tags and inside double/single-quoted attributes. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ATTR_NAME = /^[A-Za-z_][A-Za-z0-9_:-]*$/;

function attr(name: string, value: string | number | undefined): string {
  return value === undefined ? '' : ` ${name}="${esc(String(value))}"`;
}

function renderMark(m: Mark): string {
  switch (m.type) {
    case 'polyline': {
      const pts = m.points.map(([x, y]) => `${x},${y}`).join(' ');
      return `<polyline points="${esc(pts)}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('stroke-dasharray', m.strokeDasharray)}${attr('stroke-linecap', m.strokeLinecap)}/>`;
    }
    case 'path':
      return `<path d="${esc(m.d)}"${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('stroke-opacity', m.strokeOpacity)}/>`;
    case 'rect':
      // rect marks are fill-only; stroke="none" overrides the root svg's inherited
      // stroke="currentColor" so plain rects never pick up an unwanted border.
      return `<rect${attr('x', m.x)}${attr('y', m.y)}${attr('width', m.width)}${attr('height', m.height)}${attr('rx', m.rx)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', 'none')}/>`;
    case 'circle':
      return `<circle${attr('cx', m.cx)}${attr('cy', m.cy)}${attr('r', m.r)}${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('data-index', m.index)}${attr('data-series', m.seriesIndex)}/>`;
    case 'line':
      return `<line${attr('x1', m.x1)}${attr('y1', m.y1)}${attr('x2', m.x2)}${attr('y2', m.y2)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
  }
}

export function toSVG(
  scene: Scene,
  opts: { className?: string; style?: string; attrs?: Record<string, string | number> } = {},
): string {
  const extra = opts.attrs
    ? Object.entries(opts.attrs)
        .filter(([k]) => ATTR_NAME.test(k))
        .map(([k, v]) => attr(k, v))
        .join('')
    : '';
  const cls = attr('class', opts.className);
  const style = attr('style', opts.style);
  const body = scene.marks.map(renderMark).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(scene.viewBox)}" ` +
    `role="img" fill="currentColor" stroke="currentColor"${cls}${style}${extra}>` +
    `<title>${esc(scene.a11y.title)}</title><desc>${esc(scene.a11y.desc)}</desc>` +
    `${body}</svg>`
  );
}
