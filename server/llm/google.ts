import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { LLMProvider, LLMCompleteResponse } from './types.js';

function toGeminiTool(tool: { name: string; description: string; parameters: Record<string, unknown> }) {
  return {
    functionDeclarations: [
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    ],
  };
}

export const googleProvider: LLMProvider = {
  name: 'google',
  defaultModel: 'gemini-2.0-flash',
  isAvailable: () => !!config.GOOGLE_API_KEY,

  async stream(options, onChunk) {
    const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: options.model || 'gemini-2.0-flash' });

    const system = options.messages.find((m) => m.role === 'system')?.content;
    const history = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({
      history,
      systemInstruction: system,
      tools: options.tools?.map(toGeminiTool) as Tool[],
    });

    try {
      const lastMessage = options.messages[options.messages.length - 1];
      const result = await chat.sendMessageStream(lastMessage?.content || '');
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          onChunk({ content: text });
        }
      }
    } catch (err) {
      logger.error('Google stream error', { error: (err as Error).message });
      throw err;
    }
  },

  async complete(options): Promise<LLMCompleteResponse> {
    const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: options.model || 'gemini-2.0-flash' });

    const system = options.messages.find((m) => m.role === 'system')?.content;
    const history = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({
      history,
      systemInstruction: system,
      tools: options.tools?.map(toGeminiTool) as Tool[],
    });

    const lastMessage = options.messages[options.messages.length - 1];
    const result = await chat.sendMessage(lastMessage?.content || '');
    const text = result.response.text();

    return {
      content: text || '',
      finishReason: 'stop',
    };
  },
};
