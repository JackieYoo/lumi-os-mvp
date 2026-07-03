interface RelationshipNode {
  id: string;
  name: string;
  relationType?: string | null;
  summary?: string | null;
}

export function RelationshipGraph({ relationships }: { relationships: RelationshipNode[] }) {
  const size = 320;
  const centerX = size / 2;
  const centerY = size / 2;
  const centerRadius = 32;

  if (relationships.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        暂无关系数据
      </div>
    );
  }

  const radius = Math.min(size * 0.35, relationships.length * 18);
  const nodes = relationships.map((rel, i) => {
    const angle = (Math.PI * 2 * i) / relationships.length - Math.PI / 2;
    return {
      ...rel,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <svg width={size} height={size} className="overflow-visible">
      {nodes.map((node) => (
        <line
          key={`line-${node.id}`}
          x1={centerX}
          y1={centerY}
          x2={node.x}
          y2={node.y}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
      ))}

      <g>
        <circle cx={centerX} cy={centerY} r={centerRadius} fill="#38bdf8" fillOpacity={0.2} />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-200 text-xs font-medium"
        >
          我
        </text>
      </g>

      {nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={20} fill="#0f172a" stroke="#38bdf8" strokeWidth={1} />
          <text
            x={node.x}
            y={node.y - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-200 text-[10px]"
          >
            {node.name}
          </text>
          <text
            x={node.x}
            y={node.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400 text-[8px]"
          >
            {node.relationType || 'relation'}
          </text>
        </g>
      ))}
    </svg>
  );
}
