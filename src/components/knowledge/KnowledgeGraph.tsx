interface KnowledgeGraphProps {
  entities: Array<{
    id: string;
    name: string;
    entity_type: string | null;
    mentions: number;
  }>;
}

export function KnowledgeGraph({ entities }: KnowledgeGraphProps) {
  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-text-tertiary">索引文件后会自动提取实体并构建图谱。</p>
      </div>
    );
  }

  const size = 320;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;

  const nodes = entities.slice(0, 12).map((entity, i) => {
    const angle = (Math.PI * 2 * i) / Math.min(entities.length, 12) - Math.PI / 2;
    return {
      ...entity,
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
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={1}
        />
      ))}

      <circle cx={centerX} cy={centerY} r={26} fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.4)" strokeWidth={1} />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-text-secondary text-[10px] font-medium"
      >
        知识库
      </text>

      {nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={16 + Math.min(node.mentions * 2, 12)}
            fill="rgba(15,21,37,0.9)"
            stroke="rgba(56,189,248,0.5)"
            strokeWidth={1}
          />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-secondary text-[9px]"
          >
            {node.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
