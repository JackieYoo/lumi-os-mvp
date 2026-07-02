import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { LLMProvider, LLMOptions, LLMCompleteResponse, LLMToolCall } from './types.js';

function toAnthropicTool(tool: { name: string; description: string; parameters: Record<string, unknown> }) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

function toAnthropicMessages(messages: LLMOptions['messages']): Anthropic.MessageParam[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.tool_call_id || '',
            content: m.content,
          },
        ],
      } as Anthropic.MessageParam;
    }
    if (m.role === 'system') {
      // System messages handled separately
      return { role: 'user', content: `[system]\n${m.content}` };
    }
    return { role: m.role, content: m.content };
  });
}

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',
  defaultModel: 'claude-3-5-sonnet-20241022',
  isAvailable: () => !!config.ANTHROPIC_API_KEY,

  async stream(options, onChunk) {
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const system = options.messages.find((m) => m.role === 'system')?.content;
    const messages = toAnthropicMessages(options.messages.filter((m) => m.role !== 'system'));

    const stream = client.messages.stream({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      system,
      messages,
      tools: options.tools?.map(toAnthropicTool) as Anthropic.MessageCreateParams['tools'],
      temperature: options.temperature ?? 0.7,
    });

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            onChunk({ content: event.delta.text });
          }
        }
        if (event.type === 'content_block_stop') {
          // no-op
        }
      }
    } catch (err) {
      logger.error('Anthropic stream error', { error: (err as Error).message });
      throw err;
    }
  },

  async complete(options): Promise<LLMCompleteResponse> {
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const system = options.messages.find((m) => m.role === 'system')?.content;
    const messages = toAnthropicMessages(options.messages.filter((m) => m.role !== 'system'));

    const response = await client.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      system,
      messages,
      tools: options.tools?.map(toAnthropicTool) as Anthropic.MessageCreateParams['tools'],
      temperature: options.temperature ?? 0.7,
    });

    let content = '';
    const toolCalls: LLMToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: (block.input as Record<string, unknown>) || {},
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      usage: {
        promptTokens: response.usage?.input_tokens,
        completionTokens: response.usage?.output_tokens,
        totalTokens:
          (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  },
};
