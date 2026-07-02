import { retrieveRelevantMemories } from './store.js';
import { MemoryContext } from './types.js';

export async function buildMemoryContext(
  userId: string,
  currentMessage: string
): Promise<MemoryContext> {
  const memories = await retrieveRelevantMemories(userId, currentMessage, 5);
  const summary =
    memories.length > 0
      ? `Relevant memories:\n${memories.map((m) => `- ${m.content}`).join('\n')}`
      : 'No relevant memories found.';

  return { memories, summary };
}
