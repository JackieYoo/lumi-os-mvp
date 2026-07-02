import crypto from 'crypto';
import {
  createMemory,
  listMemoriesByUser,
  searchMemoriesByKeyword,
  updateMemoryAccess,
} from '../db/memories.js';
import { MemoryCandidate } from './types.js';

export async function storeMemory(
  userId: string,
  candidate: MemoryCandidate
): Promise<void> {
  const now = new Date().toISOString();
  await createMemory({
    id: crypto.randomUUID(),
    user_id: userId,
    content: candidate.content,
    importance: candidate.importance,
    embedding_json: null,
    source: null,
    created_at: now,
    last_accessed_at: now,
  });
}

export async function retrieveRelevantMemories(
  userId: string,
  query: string,
  limit = 5
): Promise<{ content: string; importance: number }[]> {
  // MVP: keyword search only; vector search can be added later.
  const memories = await searchMemoriesByKeyword(userId, query, limit);
  for (const m of memories) {
    await updateMemoryAccess(m.id);
  }
  return memories.map((m) => ({ content: m.content, importance: m.importance }));
}

export async function getRecentMemories(userId: string, limit = 20) {
  const memories = await listMemoriesByUser(userId, limit);
  return memories.map((m) => ({ content: m.content, importance: m.importance }));
}
