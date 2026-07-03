import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import {
  LLMProvider,
  LLMCompleteResponse,
  LLMToolCall,
} from './types.js';

export function createOpenAIProvider(args: {
  name:
    | 'openai'
    | 'deepseek'
    | 'ollama'
    | 'relay'
    | 'qwen'
    | 'doubao'
    | 'kimi'
    | 'glm'
    | 'xiaomi'
    | 'lmstudio';
  apiKey?: string;
  baseURL: string;
  defaultModel: string;
}): LLMProvider {
  const { name, apiKey, baseURL, defaultModel } = args;

  const client = new OpenAI({
    apiKey: apiKey || 'noop',
    baseURL,
    dangerouslyAllowBrowser: false,
  });

  const isLocalProvider = name === 'ollama' || name === 'lmstudio';

  return {
    name,
    defaultModel,
    isAvailable: () => (isLocalProvider ? true : !!apiKey),

    async stream(options, onChunk) {
      const model = options.model || defaultModel;
      const messages = options.messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
        tool_call_id: m.tool_call_id,
      }));

      try {
        const stream = await client.chat.completions.create({
          model,
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          tools: options.tools?.map(toOpenAITool),
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens,
          stream: true,
        });

        for await (const part of stream) {
          const delta = part.choices[0]?.delta;
          const finishReason = part.choices[0]?.finish_reason as
            | 'stop'
            | 'length'
            | 'tool_calls'
            | null;

          if (delta?.content) {
            onChunk({ content: delta.content, finishReason });
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              onChunk({
                toolCall: {
                  id: tc.id,
                  name: tc.function?.name,
                  arguments: tc.function?.arguments ? safeParseJson(tc.function.arguments) : undefined,
                },
                finishReason,
              });
            }
          }
        }
      } catch (err) {
        logger.error(`${name} stream error`, { error: (err as Error).message });
        throw err;
      }
    },

    async complete(options): Promise<LLMCompleteResponse> {
      const model = options.model || defaultModel;
      const messages = options.messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
        tool_call_id: m.tool_call_id,
      }));

      const completion = await client.chat.completions.create({
        model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: options.tools?.map(toOpenAITool),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: false,
      });

      const choice = completion.choices[0];
      const toolCalls: LLMToolCall[] | undefined = choice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeParseJson(tc.function.arguments) || {},
      }));

      return {
        content: choice.message.content || '',
        toolCalls,
        finishReason: choice.finish_reason as
          | 'stop'
          | 'length'
          | 'tool_calls'
          | null,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    },

    async listModels() {
      if (name === 'ollama') {
        try {
          const res = await fetch(`${baseURL}/api/tags`);
          const data = (await res.json()) as { models?: { name: string }[] };
          return data.models?.map((m) => m.name) || [];
        } catch {
          return [];
        }
      }
      return [];
    },
  };
}

function toOpenAITool(tool: { name: string; description: string; parameters: Record<string, unknown> }) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function safeParseJson(value: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export const openAIProvider = createOpenAIProvider({
  name: 'openai',
  apiKey: config.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o-mini',
});

export const deepseekProvider = createOpenAIProvider({
  name: 'deepseek',
  apiKey: config.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat',
});

export const ollamaProvider = createOpenAIProvider({
  name: 'ollama',
  baseURL: config.OLLAMA_BASE_URL,
  defaultModel: 'llama3.1',
});

export const relayProvider = createOpenAIProvider({
  name: 'relay',
  apiKey: config.CUSTOM_RELAY_API_KEY,
  baseURL: config.CUSTOM_RELAY_BASE_URL || 'https://api.openai.com/v1',
  defaultModel: config.CUSTOM_RELAY_MODEL || 'gpt-4o-mini',
});

export const qwenProvider = createOpenAIProvider({
  name: 'qwen',
  apiKey: config.DASHSCOPE_API_KEY,
  baseURL: config.DASHSCOPE_BASE_URL,
  defaultModel: 'qwen-max',
});

export const doubaoProvider = createOpenAIProvider({
  name: 'doubao',
  apiKey: config.ARK_API_KEY,
  baseURL: config.ARK_BASE_URL,
  defaultModel: 'doubao-1.5-pro-32k',
});

export const kimiProvider = createOpenAIProvider({
  name: 'kimi',
  apiKey: config.KIMI_API_KEY,
  baseURL: config.KIMI_BASE_URL,
  defaultModel: 'moonshot-v1-8k',
});

export const glmProvider = createOpenAIProvider({
  name: 'glm',
  apiKey: config.GLM_API_KEY,
  baseURL: config.GLM_BASE_URL,
  defaultModel: 'glm-4-flash',
});

export const xiaomiProvider = createOpenAIProvider({
  name: 'xiaomi',
  apiKey: config.XIAOMI_API_KEY,
  baseURL: config.XIAOMI_BASE_URL,
  defaultModel: 'milm',
});

export const lmStudioProvider = createOpenAIProvider({
  name: 'lmstudio',
  baseURL: config.LM_STUDIO_BASE_URL,
  defaultModel: 'local-model',
});
