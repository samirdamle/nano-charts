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
                fill={mark.fill ?? 'none'}
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
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
                stroke={mark.stroke}
                strokeWidth={mark.strokeWidth}
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
        }
      })}
    </>
  );
}
