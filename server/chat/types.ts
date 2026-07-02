import { LLMToolCall } from '../llm/types.js';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: string;
  tool_call_id?: string;
  created_at: string;
}

export interface ChatStreamEvent {
  type: 'delta' | 'tool_call' | 'tool_result' | 'memory_retrieval' | 'llm_reasoning' | 'done' | 'error';
  content?: string;
  toolCall?: LLMToolCall;
  toolResult?: unknown;
  memories?: { content: string; importance: number }[];
  error?: string;
}
