import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

interface TreeNode3D {
  id: string;
  position: [number, number, number];
  radius: number;
  hue: number;
  content: string;
  importance: number;
  created_at: string;
}

interface MemoryTree3DProps {
  memories: {
    id: string;
    content: string;
    importance: number;
    created_at: string;
    source: string | null;
  }[];
  searchQuery?: string;
  onNodeClick?: (node: TreeNode3D) => void;
  className?: string;
}

export type { TreeNode3D };

function NodeSphere({
  node,
  isDimmed,
  onClick,
}: {
  node: TreeNode3D;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = new THREE.Color(`hsl(${node.hue}, 80%, ${isDimmed ? 30 : 60}%)`);

  return (
    <mesh
      position={node.position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.3 : 1}
    >
      <sphereGeometry args={[node.radius, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={isDimmed ? 0.2 : 0.9} />
    </mesh>
  );
}

function ConnectionLine({
  start,
  end,
  hue,
  isDimmed,
}: {
  start: [number, number, number];
  end: [number, number, number];
  hue: number;
  isDimmed: boolean;
}) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);

  return (
    <line>
      <bufferGeometry attach="geometry" >
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        attach="material"
        color={new THREE.Color(`hsl(${hue}, 70%, 60%)`)}
        transparent
        opacity={isDimmed ? 0.05 : 0.3}
      />
    </line>
  );
}

export function MemoryTree3D({ memories, searchQuery = '', onNodeClick, className }: MemoryTree3DProps) {
  const { nodes, connections } = useMemo(() => {
    const groups = new Map<string, typeof memories>();
    for (const memory of memories) {
      const date = new Date(memory.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month)!.push(memory);
    }

    const sortedMonths = Array.from(groups.keys()).sort();
    const resultNodes: TreeNode3D[] = [];
    const resultConnections: { start: [number, number, number]; end: [number, number, number]; hue: number }[] = [];
    const rootPos: [number, number, number] = [0, -4, 0];

    sortedMonths.forEach((month, monthIndex) => {
      const monthMemories = groups.get(month)!;
      const angleBase = (monthIndex / Math.max(sortedMonths.length, 1)) * Math.PI * 2;
      const y = -2 + monthIndex * 1.5;
      const radius = 3 + monthIndex * 0.5;

      monthMemories.forEach((memory, i) => {
        const angle = angleBase + (i / Math.max(monthMemories.length, 1)) * 0.8 - 0.4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const hue = memory.importance >= 8 ? 210 : memory.importance >= 5 ? 140 : 35;

        const node: TreeNode3D = {
          id: memory.id,
          position: [x, y, z],
          radius: 0.15 + memory.importance * 0.02,
          hue,
          content: memory.content,
          importance: memory.importance,
          created_at: memory.created_at,
        };

        resultNodes.push(node);
        resultConnections.push({ start: rootPos, end: node.position, hue });
      });
    });

    return { nodes: resultNodes, connections: resultConnections };
  }, [memories]);

  return (
    <div className={`h-full w-full ${className || ''}`}>
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <color attach="background" args={['#0a0f1c']} />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        <mesh position={[0, -4, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        <Text
          position={[0, -5, 0]}
          fontSize={0.3}
          color="#94a3b8"
          anchorX="center"
        >
          记忆之根
        </Text>

        {connections.map((conn, idx) => {
          const matches = searchQuery
            ? nodes.some((node) =>
                node.position[0] === conn.end[0] &&
                node.position[1] === conn.end[1] &&
                node.position[2] === conn.end[2] &&
                node.content.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : true;
          return (
            <ConnectionLine
              key={`conn-${idx}`}
              start={conn.start}
              end={conn.end}
              hue={conn.hue}
              isDimmed={!matches}
            />
          );
        })}

        {nodes.map((node) => {
          const matches = searchQuery
            ? node.content.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
          return (
            <NodeSphere
              key={node.id}
              node={node}
              isDimmed={!matches}
              onClick={() => onNodeClick?.(node)}
            />
          );
        })}

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}

export default MemoryTree3D;
