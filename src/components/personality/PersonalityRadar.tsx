interface PersonalityVector {
  warmth: number;
  curiosity: number;
  creativity: number;
  rationality: number;
  empathy: number;
  assertiveness: number;
  playfulness: number;
  depth: number;
}

interface PersonalityRadarProps {
  vector: PersonalityVector;
  size?: number;
}

const LABELS: Record<keyof PersonalityVector, string> = {
  warmth: '温暖',
  curiosity: '好奇',
  creativity: '创造',
  rationality: '理性',
  empathy: '共情',
  assertiveness: '主动',
  playfulness: '活泼',
  depth: '深度',
};

export function PersonalityRadar({ vector, size = 240 }: PersonalityRadarProps) {
  const keys = Object.keys(vector) as (keyof PersonalityVector)[];
  const count = keys.length;
  const center = size / 2;
  const radius = size * 0.35;
  const angleFor = (i: number) => (Math.PI * 2 * i) / count - Math.PI / 2;

  const gridLevels = [20, 40, 60, 80, 100];

  const polyPoints = keys
    .map((key, i) => {
      const value = vector[key] || 0;
      const angle = angleFor(i);
      const r = (value / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} className="overflow-visible">
      {gridLevels.map((level) => {
        const r = (level / 100) * radius;
        const points = Array.from({ length: count }, (_, i) => {
          const angle = angleFor(i);
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="rgba(148,163,184,0.2)"
            strokeWidth={1}
          />
        );
      })}

      {keys.map((key, i) => {
        const angle = angleFor(i);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        return (
          <line
            key={key}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(148,163,184,0.2)"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={polyPoints}
        fill="rgba(56,189,248,0.25)"
        stroke="#38bdf8"
        strokeWidth={2}
      />

      {keys.map((key, i) => {
        const angle = angleFor(i);
        const labelRadius = radius + 22;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        return (
          <text
            key={`label-${key}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-300 text-[10px]"
          >
            {LABELS[key]}
          </text>
        );
      })}
    </svg>
  );
}
