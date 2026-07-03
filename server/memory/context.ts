import { retrieveRelevantMemories } from './store.js';
import { retrieveKnowledgeChunks } from '../knowledge/embeddings.js';
import { MemoryContext } from './types.js';

export async function buildMemoryContext(
  userId: string,
  currentMessage: string,
): Promise<MemoryContext> {
  const [memories, knowledgeChunks] = await Promise.all([
    retrieveRelevantMemories(userId, currentMessage, 5),
    retrieveKnowledgeChunks(userId, currentMessage, 3).catch(() => []),
  ]);

  const parts: string[] = [];

  if (memories.length > 0) {
    parts.push(
      `Relevant memories:\n${memories.map((m) => `- ${m.content}`).join('\n')}`,
    );
  }

  if (knowledgeChunks.length > 0) {
    parts.push(
      `Relevant knowledge:\n${knowledgeChunks
        .map((k) => `- [${k.source}] ${k.content}`)
        .join('\n')}`,
    );
  }

  const summary =
    parts.length > 0
      ? parts.join('\n\n')
      : 'No relevant memories or knowledge found.';

  return {
    memories: [
      ...memories,
      ...knowledgeChunks.map((k) => ({ content: `[${k.source}] ${k.content}`, importance: 4 })),
    ],
    summary,
  };
}
