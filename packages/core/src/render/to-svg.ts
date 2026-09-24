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
      return `<path d="${esc(m.d)}"${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}${attr('stroke-opacity', m.strokeOpacity)}${attr('stroke-linecap', m.strokeLinecap)}/>`;
    case 'rect':
      // rect marks are fill-only; stroke="none" overrides the root svg's inherited
      // stroke="currentColor" so plain rects never pick up an unwanted border.
      return `<rect${attr('x', m.x)}${attr('y', m.y)}${attr('width', m.width)}${attr('height', m.height)}${attr('rx', m.rx)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', 'none')}/>`;
    case 'circle':
      // Like rects, circles default to stroke="none" so fill-based marks never pick
      // up the root svg's inherited stroke="currentColor"; an explicit mark stroke
      // still wins.
      return `<circle${attr('cx', m.cx)}${attr('cy', m.cy)}${attr('r', m.r)}${attr('fill', m.fill)}${attr('stroke', m.stroke ?? 'none')}${attr('stroke-width', m.strokeWidth)}${attr('data-index', m.index)}${attr('data-series', m.seriesIndex)}/>`;
    case 'line':
      return `<line${attr('x1', m.x1)}${attr('y1', m.y1)}${attr('x2', m.x2)}${attr('y2', m.y2)}${attr('stroke', m.stroke)}${attr('stroke-width', m.strokeWidth)}/>`;
    case 'text':
      // No fill default: inherits currentColor (the chart's text color) unless set.
      // stroke="none" overrides the root svg's inherited stroke="currentColor":
      // a 1-unit stroke on tiny label glyphs renders as fat blobby outlines
      // with miter-join spikes (rect/circle/use do the same).
      return `<text${attr('x', m.x)}${attr('y', m.y)}${attr('font-size', m.fontSize)}${attr('font-weight', m.fontWeight)}${attr('fill', m.fill)}${attr('stroke', 'none')}${attr('text-anchor', m.textAnchor)}>${esc(m.text)}</text>`;
    case 'defs': {
      // A reusable block shape drawn at the origin with no fill of its own,
      // so each <use> reference inherits its fill (and opacity) instead.
      // The id sits on the shape itself, unless this is a pre-clipped
      // partial-block variant — then it goes on the wrapping <g>.
      const shape = (idOnShape: boolean) => {
        const id = idOnShape ? ` id="${esc(m.id)}"` : '';
        return m.shape === 'rect'
          ? `<rect${id}${attr('width', m.size)}${attr('height', m.size)}${attr('rx', m.radius)}/>`
          : m.shape === 'circle'
            ? `<circle${id}${attr('cx', m.size / 2)}${attr('cy', m.size / 2)}${attr('r', m.size / 2)}/>`
            : `<text${id}${attr('font-size', m.size)}${attr('y', Math.round(m.size * 0.8))}>${esc(m.emoji ?? '')}</text>`;
      };
      if (m.clip === undefined) return `<defs>${shape(true)}</defs>`;
      // Partial-block variant, pre-clipped inside <defs>: clip-path placed
      // directly on <use> does not render in browsers, so the overlay <use>
      // references this clipped <g> instead. The clip rect uses the block's
      // local coordinates.
      const c = m.clip;
      const clipId = `${m.id}-clip`;
      return `<defs><clipPath id="${esc(clipId)}"><rect${attr('x', c.x)}${attr('y', c.y)}${attr('width', c.width)}${attr('height', c.height)}/></clipPath><g id="${esc(m.id)}" clip-path="url(#${esc(clipId)})">${shape(false)}</g></defs>`;
    }
    case 'use':
      // stroke="none" overrides the root svg's inherited stroke="currentColor"
      // so blocks never pick up an unwanted border (rect/circle do the same).
      return `<use${attr('href', m.href)}${attr('x', m.x)}${attr('y', m.y)}${attr('fill', m.fill)}${attr('fill-opacity', m.fillOpacity)}${attr('stroke', 'none')}${attr('data-index', m.index)}/>`;
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
  // No <title> child: browsers render it as a hover tooltip ("radar chart"),
  // which spoils the experience. The accessible name comes from aria-label
  // instead; <desc> keeps the data summary for assistive tech (it never
  // tooltips).
  const label = attr('aria-label', scene.a11y.title);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(scene.viewBox)}" ` +
    `role="img"${label} fill="currentColor" stroke="currentColor"${cls}${style}${extra}>` +
    `<desc>${esc(scene.a11y.desc)}</desc>` +
    `${body}</svg>`
  );
}
