export type CanvasNodeType =
  | 'user_input'
  | 'memory_retrieval'
  | 'tool_call'
  | 'tool_result'
  | 'llm_reasoning'
  | 'response';

export interface CanvasNodeData {
  id: string;
  type: CanvasNodeType;
  title: string;
  detail?: string;
  meta?: Record<string, string | number | undefined>;
  timestamp: number;
}
