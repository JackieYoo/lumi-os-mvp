import type { CanvasNodeData } from '../types/canvas.js';

export interface StreamEvent {
  type?: string;
  content?: string;
  toolCall?: { id: string; name: string; arguments: Record<string, unknown> };
  toolResult?: unknown;
  memories?: { content: string; importance: number }[];
  error?: string;
}

let idCounter = 0;

function nextId(): string {
  return `canvas-node-${Date.now()}-${++idCounter}`;
}

export function eventToCanvasNodes(
  _userMessage: string,
  event: StreamEvent
): CanvasNodeData[] {
  const timestamp = Date.now();

  switch (event.type) {
    case 'memory_retrieval':
      if (!event.memories || event.memories.length === 0) return [];
      return [
        {
          id: nextId(),
          type: 'memory_retrieval',
          title: `检索到 ${event.memories.length} 条相关记忆`,
          detail: event.memories.map((m) => `• ${m.content}`).join('\n'),
          meta: { count: event.memories.length },
          timestamp,
        },
      ];

    case 'llm_reasoning':
      return [
        {
          id: nextId(),
          type: 'llm_reasoning',
          title: '正在思考...',
          timestamp,
        },
      ];

    case 'tool_call':
      if (!event.toolCall) return [];
      return [
        {
          id: nextId(),
          type: 'tool_call',
          title: event.toolCall.name,
          detail: JSON.stringify(event.toolCall.arguments, null, 2),
          timestamp,
        },
      ];

    case 'tool_result':
      if (!event.toolCall) return [];
      return [
        {
          id: nextId(),
          type: 'tool_result',
          title: `${event.toolCall.name} 结果`,
          detail: JSON.stringify(event.toolResult, null, 2),
          timestamp,
        },
      ];

    case 'delta':
      if (!event.content) return [];
      return [
        {
          id: nextId(),
          type: 'response',
          title: event.content,
          timestamp,
        },
      ];

    case 'error':
      return [
        {
          id: nextId(),
          type: 'response',
          title: `错误: ${event.error || 'Unknown error'}`,
          timestamp,
        },
      ];

    default:
      return [];
  }
}

export function createUserInputNode(message: string): CanvasNodeData {
  return {
    id: nextId(),
    type: 'user_input',
    title: message,
    timestamp: Date.now(),
  };
}
