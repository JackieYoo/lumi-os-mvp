import crypto from 'crypto';
import { LLMMessage } from '../llm/types.js';
import { streamLLM, completeLLM } from '../llm/router.js';
import { listTools, executeTool } from '../tools/registry.js';
import { buildMemoryContext } from '../memory/context.js';
import { extractMemories } from '../memory/extractor.js';
import { storeMemory } from '../memory/store.js';
import { createMessage, listMessagesBySession } from '../db/messages.js';
import { updateSessionTitle } from '../db/sessions.js';
import { ChatStreamEvent } from './types.js';

const SYSTEM_PROMPT = `You are Lumi, a personal AI companion.
- You are warm, concise, and helpful.
- You have access to tools; use them when needed.
- When you use a tool, explain what you are doing briefly.`;

export interface ChatOptions {
  sessionId: string;
  userId: string;
  message: string;
  provider: string;
  model?: string;
  enableMemory?: boolean;
  enableTools?: boolean;
  onEvent: (event: ChatStreamEvent) => void;
}

export async function handleChatStream(options: ChatOptions): Promise<void> {
  const { sessionId, userId, message, provider, model, enableMemory, enableTools, onEvent } =
    options;

  // Save user message
  const userMessageId = crypto.randomUUID();
  await createMessage({
    id: userMessageId,
    session_id: sessionId,
    role: 'user',
    content: message,
    tool_calls: null,
    tool_call_id: null,
    created_at: new Date().toISOString(),
  });

  // Build context
  const history = await listMessagesBySession(sessionId);
  const memoryContext = enableMemory ? await buildMemoryContext(userId, message) : null;

  if (memoryContext && memoryContext.memories.length > 0) {
    onEvent({ type: 'memory_retrieval', memories: memoryContext.memories });
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: buildSystemPrompt(memoryContext?.summary) },
    ...history.map((m) => ({
      role: m.role,
      content: m.content || '',
      tool_call_id: m.tool_call_id || undefined,
    })),
  ];

  const tools = enableTools ? listTools() : [];

  onEvent({ type: 'llm_reasoning' });

  // First call: allow tool usage
  const response = await completeLLM({
    provider,
    model,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    temperature: 0.7,
  });

  // Handle tool calls
  if (response.toolCalls && response.toolCalls.length > 0) {
    // Append assistant message with all tool_calls once
    messages.push({
      role: 'assistant',
      content: response.content || '',
    });

    await createMessage({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'assistant',
      content: response.content || '',
      tool_calls: JSON.stringify(response.toolCalls),
      tool_call_id: null,
      created_at: new Date().toISOString(),
    });

    // Execute each tool and append results
    for (const toolCall of response.toolCalls) {
      onEvent({ type: 'tool_call', toolCall });
      const result = await executeTool(toolCall.name, toolCall.arguments);
      onEvent({ type: 'tool_result', toolCall, toolResult: result });

      messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });

      await createMessage({
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: 'tool',
        content: JSON.stringify(result),
        tool_calls: null,
        tool_call_id: toolCall.id,
        created_at: new Date().toISOString(),
      });
    }

    // Second call with tool results
    onEvent({ type: 'llm_reasoning' });
    await streamLLM(
      {
        provider,
        model,
        messages,
        temperature: 0.7,
      },
      (chunk) => {
        if (chunk.content) {
          onEvent({ type: 'delta', content: chunk.content });
        }
      }
    );
  } else {
    // Stream direct response
    onEvent({ type: 'delta', content: response.content });
  }

  onEvent({ type: 'done' });

  // Extract and store memories asynchronously
  if (enableMemory) {
    const allMessages = await listMessagesBySession(sessionId);
    const candidates = await extractMemories(
      allMessages.map((m) => ({ role: m.role, content: m.content || '' }))
    );
    for (const candidate of candidates) {
      await storeMemory(userId, candidate);
    }
  }

  // Update session title if first user message
  if (history.length <= 1) {
    const title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
    await updateSessionTitle(sessionId, title);
  }
}

function buildSystemPrompt(memorySummary?: string): string {
  if (memorySummary) {
    return `${SYSTEM_PROMPT}\n\n${memorySummary}`;
  }
  return SYSTEM_PROMPT;
}
