import type { Mark } from '@samirdamle/nano-charts';

export function Marks({ marks }: { marks: Mark[] }) {
  return (
    <>
      {marks.map((mark, i) => {
        switch (mark.type) {
          case 'polyline':
            return (
              <polyline
                key={i}
                points={mark.points.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={mark.fill}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
                strokeDasharray={mark.strokeDasharray}
                strokeLinecap={mark.strokeLinecap}
              />
            );
          case 'path':
            return (
              <path
                key={i}
                d={mark.d}
                fill={mark.fill}
                fillOpacity={mark.fillOpacity}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
                strokeOpacity={mark.strokeOpacity}
                strokeDasharray={mark.strokeDasharray}
                strokeLinecap={mark.strokeLinecap}
              />
            );
          case 'rect':
            return (
              <rect
                key={i}
                x={mark.x}
                y={mark.y}
                width={mark.width}
                height={mark.height}
                rx={mark.rx}
                fill={mark.fill}
                fillOpacity={mark.fillOpacity}
                stroke="none"
              />
            );
          case 'circle':
            return (
              <circle
                key={i}
                cx={mark.cx}
                cy={mark.cy}
                r={mark.r}
                fill={mark.fill}
                stroke={mark.stroke ?? 'none'}
                strokeWidth={mark.strokeWidth}
                data-index={mark.index}
                data-series={mark.seriesIndex}
              />
            );
          case 'line':
            return (
              <line
                key={i}
                x1={mark.x1}
                y1={mark.y1}
                x2={mark.x2}
                y2={mark.y2}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
              />
            );
          case 'text':
            return (
              <text
                key={i}
                x={mark.x}
                y={mark.y}
                fontSize={mark.fontSize}
                fontWeight={mark.fontWeight}
                fill={mark.fill}
                stroke="none"
                textAnchor={mark.textAnchor}
              >
                {mark.text}
              </text>
            );
          case 'defs': {
            const renderShape = (id?: string) =>
              mark.shape === 'rect' ? (
                <rect id={id} width={mark.size} height={mark.size} rx={mark.radius} />
              ) : mark.shape === 'circle' ? (
                <circle id={id} cx={mark.size / 2} cy={mark.size / 2} r={mark.size / 2} />
              ) : (
                <text id={id} fontSize={mark.size} y={Math.round(mark.size * 0.8)}>
                  {mark.emoji}
                </text>
              );
            // Partial-block variant, pre-clipped inside <defs>: clip-path on
            // <use> does not render in browsers, so the overlay <use>
            // references this clipped <g> instead.
            if (mark.clip !== undefined) {
              return (
                <defs key={i}>
                  <clipPath id={`${mark.id}-clip`}>
                    <rect x={mark.clip.x} y={mark.clip.y} width={mark.clip.width} height={mark.clip.height} />
                  </clipPath>
                  <g id={mark.id} clipPath={`url(#${mark.id}-clip)`}>
                    {renderShape()}
                  </g>
                </defs>
              );
            }
            return <defs key={i}>{renderShape(mark.id)}</defs>;
          }
          case 'use':
            return (
              <use
                key={i}
                href={mark.href}
                x={mark.x}
                y={mark.y}
                fill={mark.fill}
                fillOpacity={mark.fillOpacity}
                stroke="none"
                data-index={mark.index}
              />
            );
        }
      })}
    </>
  );
}
