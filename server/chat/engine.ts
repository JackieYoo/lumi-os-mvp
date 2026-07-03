import crypto from 'crypto';
import { LLMMessage } from '../llm/types.js';
import { streamLLM, completeLLM } from '../llm/router.js';
import { listTools, executeTool } from '../tools/registry.js';
import { listMCPTools, executeMCPTool } from '../mcp/tools.js';
import { buildMemoryContext } from '../memory/context.js';
import { extractMemories } from '../memory/extractor.js';
import { storeMemory } from '../memory/store.js';
import { extractRelationships } from '../memory/relationships.js';
import { createMessage, listMessagesBySession } from '../db/messages.js';
import { updateSessionTitle } from '../db/sessions.js';
import { getOrCreatePersonalityProfile, buildPersonalityContext, evolveFromChat } from '../personality/engine.js';
import type { PersonalityProfile } from '../personality/types.js';
import { emitChatEvent } from '../socket/chat.js';
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

  const notify = (event: ChatStreamEvent) => {
    onEvent(event);
    emitChatEvent(sessionId, event);
  };

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
  const personalityProfile = await getOrCreatePersonalityProfile(userId);

  if (memoryContext && memoryContext.memories.length > 0) {
    notify({ type: 'memory_retrieval', memories: memoryContext.memories });
  }

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(memoryContext?.summary, personalityProfile),
    },
    ...history.map((m) => ({
      role: m.role,
      content: m.content || '',
      tool_call_id: m.tool_call_id || undefined,
    })),
  ];

  const builtInTools = enableTools ? listTools() : [];
  const mcpTools = enableTools
    ? listMCPTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }))
    : [];
  const tools = [...builtInTools, ...mcpTools];

  notify({ type: 'llm_reasoning' });

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
      notify({ type: 'tool_call', toolCall });
      let result: unknown;
      try {
        result = await executeTool(toolCall.name, toolCall.arguments);
      } catch (err) {
        if ((err as Error).message?.includes('Tool not found')) {
          result = await executeMCPTool(toolCall.name, toolCall.arguments);
        } else {
          throw err;
        }
      }
      notify({ type: 'tool_result', toolCall, toolResult: result });

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
    notify({ type: 'llm_reasoning' });
    await streamLLM(
      {
        provider,
        model,
        messages,
        temperature: 0.7,
      },
      (chunk) => {
        if (chunk.content) {
          notify({ type: 'delta', content: chunk.content });
        }
      }
    );
  } else {
    // Stream direct response
    notify({ type: 'delta', content: response.content });
  }

  notify({ type: 'done' });

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

  // Evolve personality asynchronously
  void evolveFromChat(userId, provider, model, sessionId).catch(() => {
    // errors logged inside engine
  });

  // Extract relationships asynchronously
  void extractRelationships(
    userId,
    history.map((m) => `${m.role}: ${m.content || ''}`).join('\n'),
  ).catch(() => {
    // errors logged inside relationships
  });

  // Update session title if first user message
  if (history.length <= 1) {
    const title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
    await updateSessionTitle(sessionId, title);
  }
}

function buildSystemPrompt(
  memorySummary?: string,
  personalityProfile?: PersonalityProfile,
): string {
  const parts = [SYSTEM_PROMPT];
  if (memorySummary) {
    parts.push(memorySummary);
  }
  if (personalityProfile) {
    parts.push(buildPersonalityContext(personalityProfile));
  }
  return parts.join('\n\n');
}
