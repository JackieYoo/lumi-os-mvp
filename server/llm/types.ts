export type LLMRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMMessage {
  role: LLMRole;
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface LLMToolParameter {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMOptions {
  provider: string;
  model?: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMStreamChunk {
  content?: string;
  toolCall?: Partial<LLMToolCall>;
  finishReason?: 'stop' | 'length' | 'tool_calls' | null;
}

export interface LLMCompleteResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | null;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export type LLMProviderName = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'ollama' | 'relay';

export interface LLMProvider {
  name: LLMProviderName;
  defaultModel: string;
  isAvailable(): boolean;
  stream(options: LLMOptions, onChunk: (chunk: LLMStreamChunk) => void): Promise<void>;
  complete(options: LLMOptions): Promise<LLMCompleteResponse>;
  listModels?(): Promise<string[]>;
}
