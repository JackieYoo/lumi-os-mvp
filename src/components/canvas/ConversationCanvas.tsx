import { useMemo, useRef, useEffect } from 'react';
import { CanvasNode } from './CanvasNode.js';
import { CanvasConnection } from './CanvasConnection.js';
import type { CanvasNodeData } from '../../types/canvas.js';

interface ConversationCanvasProps {
  nodes: CanvasNodeData[];
  isStreaming?: boolean;
  className?: string;
}

export function ConversationCanvas({
  nodes,
  isStreaming = false,
  className,
}: ConversationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [nodes]);

  const groupedNodes = useMemo(() => {
    // Merge consecutive response deltas into one node
    const result: CanvasNodeData[] = [];
    let currentResponse: CanvasNodeData | null = null;

    for (const node of nodes) {
      if (node.type === 'response') {
        if (currentResponse) {
          const prev: CanvasNodeData = currentResponse;
          currentResponse = {
            ...prev,
            title: prev.title + node.title,
            detail: [prev.detail, node.detail].filter(Boolean).join(''),
          };
        } else {
          currentResponse = { ...node };
        }
      } else {
        if (currentResponse) {
          result.push(currentResponse);
          currentResponse = null;
        }
        result.push(node);
      }
    }

    if (currentResponse) {
      result.push(currentResponse);
    }

    return result;
  }, [nodes]);

  if (groupedNodes.length === 0) {
    return (
      <div
        className={`flex h-full items-center justify-center text-slate-500 ${className || ''}`}
      >
        发送消息以查看对话流程
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex h-full flex-col gap-1 overflow-y-auto p-4 ${className || ''}`}
    >
      {groupedNodes.map((node, index) => (
        <div key={node.id} className="flex flex-col">
          <CanvasNode
            node={node}
            isLast={index === groupedNodes.length - 1}
          />
          {index < groupedNodes.length - 1 && (
            <CanvasConnection active={isStreaming && index === groupedNodes.length - 2} />
          )}
        </div>
      ))}
    </div>
  );
}
