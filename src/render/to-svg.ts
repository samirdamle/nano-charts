import type { Mark, Scene } from '../types';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function attr(name: string, value: string | number | undefined): string {
  return value === undefined ? '' : ` ${name}="${value}"`;
}

function renderMark(m: Mark): string {
  switch (m.type) {
    case 'polyline': {
      const pts = m.points.map(([x, y]) => `${x},${y}`).join(' ');
      return `<polyline points="${pts}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    }
    case 'path':
      return `<path d="${m.d}"${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'rect':
      return `<rect x="${m.x}" y="${m.y}" width="${m.width}" height="${m.height}"${attr('rx', m.rx)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}/>`;
    case 'circle':
      return `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}"${attr('fill', m.fill)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'line':
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}"${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
  }
}

export function toSVG(
  scene: Scene,
  opts: { className?: string; style?: string; attrs?: Record<string, string | number> } = {},
): string {
  const extra = opts.attrs
    ? Object.entries(opts.attrs)
        .map(([k, v]) => attr(k, v))
        .join('')
    : '';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const style = opts.style ? ` style="${opts.style}"` : '';
  const body = scene.marks.map(renderMark).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.viewBox}" ` +
    `role="img" fill="currentColor" stroke="currentColor"${cls}${style}${extra}>` +
    `<title>${esc(scene.a11y.title)}</title><desc>${esc(scene.a11y.desc)}</desc>` +
    `${body}</svg>`
  );
}
