import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';

interface MemoryNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  hue: number;
  content: string;
  importance: number;
  created_at: string;
  source: string | null;
  alpha: number;
  targetAlpha: number;
}

interface PixelTreeProps {
  memories: {
    id: string;
    content: string;
    importance: number;
    created_at: string;
    source: string | null;
  }[];
  searchQuery?: string;
  onNodeClick?: (node: MemoryNode) => void;
  className?: string;
}

export type { MemoryNode };

export function PixelTree({ memories, searchQuery = '', onNodeClick, className }: PixelTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<MemoryNode[]>([]);
  const animationRef = useRef<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2 + dimensions.height * 0.3;

    // Group by month
    const groups = new Map<string, typeof memories>();
    for (const memory of memories) {
      const date = new Date(memory.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month)!.push(memory);
    }

    const sortedMonths = Array.from(groups.keys()).sort();
    const nodes: MemoryNode[] = [];

    sortedMonths.forEach((month, monthIndex) => {
      const monthMemories = groups.get(month)!;
      const angleBase = (monthIndex / Math.max(sortedMonths.length, 1)) * Math.PI * 2;
      const radius = 80 + monthIndex * 40;

      monthMemories.forEach((memory, i) => {
        const angle = angleBase + (i / Math.max(monthMemories.length, 1)) * 0.8 - 0.4;
        const matches = searchQuery
          ? memory.content.toLowerCase().includes(searchQuery.toLowerCase())
          : true;

        nodes.push({
          id: memory.id,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius - monthIndex * 30,
          radius: 4 + memory.importance * 0.8,
          hue: memory.importance >= 8 ? 210 : memory.importance >= 5 ? 140 : 35,
          content: memory.content,
          importance: memory.importance,
          created_at: memory.created_at,
          source: memory.source,
          alpha: 0,
          targetAlpha: matches ? 1 : 0.15,
        });
      });
    });

    nodesRef.current = nodes;
  }, [memories, dimensions, searchQuery]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2 + dimensions.height * 0.3;

      // Draw root glow
      const rootGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
      rootGradient.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
      rootGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = rootGradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw root node
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.fill();

      const nodes = nodesRef.current;

      // Draw connections
      nodes.forEach((node) => {
        const alpha = node.alpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo(
          centerX + (node.x - centerX) * 0.5,
          centerY - 40,
          node.x,
          node.y
        );
        ctx.strokeStyle = `hsla(${node.hue}, 70%, 60%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        node.alpha += (node.targetAlpha - node.alpha) * 0.1;
        const pulse = 1 + Math.sin(time * 0.002 + node.x * 0.01) * 0.1;
        const r = node.radius * pulse;

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${node.hue}, 80%, 60%, ${node.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${node.hue}, 80%, 60%, ${node.alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      time += 16;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    const hovered = nodesRef.current.find((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 4;
    });

    setHoveredNode(hovered || null);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  };

  const handleClick = () => {
    if (hoveredNode && onNodeClick) {
      onNodeClick(hoveredNode);
    }
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-slate-700/50 bg-celestial-panel/90 p-3 text-xs text-slate-200 shadow-lg backdrop-blur"
          style={{
            left: Math.min(hoveredNode.x + 16, dimensions.width - 200),
            top: Math.max(hoveredNode.y - 16, 16),
          }}
        >
          <p className="line-clamp-4">{hoveredNode.content}</p>
        </div>
      )}
    </div>
  );
}
