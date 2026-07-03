import crypto from 'crypto';
import {
  createMemory,
  listMemoriesByUser,
  searchMemoriesByKeyword,
  updateMemoryAccess,
} from '../db/memories.js';
import { saveMemoryEmbedding, listMemoryEmbeddings } from '../db/embeddings.js';
import { generateEmbedding, cosineSimilarity } from './embeddings.js';
import { MemoryCandidate } from './types.js';

export async function storeMemory(
  userId: string,
  candidate: MemoryCandidate,
): Promise<void> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await createMemory({
    id,
    user_id: userId,
    content: candidate.content,
    importance: candidate.importance,
    embedding_json: null,
    source: null,
    created_at: now,
    last_accessed_at: now,
  });

  const embedding = await generateEmbedding(candidate.content);
  if (embedding) {
    await saveMemoryEmbedding(id, userId, embedding);
  }
}

export async function retrieveRelevantMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<{ content: string; importance: number }[]> {
  return retrieveRelevantMemoriesHybrid(userId, query, limit);
}

export async function retrieveRelevantMemoriesHybrid(
  userId: string,
  query: string,
  limit = 5,
): Promise<{ content: string; importance: number }[]> {
  const keywordMemories = await searchMemoriesByKeyword(userId, query, limit * 2);

  const queryEmbedding = await generateEmbedding(query);
  let semanticMemories: { id: string; content: string; importance: number; score: number }[] = [];

  if (queryEmbedding) {
    const embeddings = await listMemoryEmbeddings(userId);
    const scored = embeddings
      .map((record) => {
        const embedding = JSON.parse(record.embedding_json) as number[];
        return {
          id: record.memory_id,
          score: cosineSimilarity(queryEmbedding, embedding),
        };
      })
      .filter((item) => item.score > 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2);

    const keywordIds = new Set(keywordMemories.map((m) => m.id));
    const missingIds = scored.filter((s) => !keywordIds.has(s.id)).map((s) => s.id);

    if (missingIds.length > 0) {
      const db = await import('../db/connection.js').then((m) => m.getDb());
      const placeholders = missingIds.map(() => '?').join(',');
      const rows = await db.all<Array<{ id: string; content: string; importance: number }>>(
        `SELECT id, content, importance FROM memories WHERE id IN (${placeholders}) AND user_id = ?`,
        ...missingIds,
        userId,
      );

      const rowMap = new Map(rows.map((r) => [r.id, r]));
      semanticMemories = scored
        .map((s) => {
          const row = rowMap.get(s.id);
          if (!row) return null;
          return {
            id: s.id,
            content: row.content,
            importance: row.importance,
            score: s.score,
          };
        })
        .filter(Boolean) as typeof semanticMemories;
    }
  }

  const combined = new Map<
    string,
    { id: string; content: string; importance: number; score: number }
  >();

  for (const m of keywordMemories) {
    combined.set(m.id, { id: m.id, content: m.content, importance: m.importance, score: 0.5 });
  }
  for (const m of semanticMemories) {
    const existing = combined.get(m.id);
    if (existing) {
      existing.score = Math.max(existing.score, m.score);
    } else {
      combined.set(m.id, m);
    }
  }

  const results = Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const m of results) {
    await updateMemoryAccess(m.id);
  }

  return results.map((m) => ({ content: m.content, importance: m.importance }));
}

export async function getRecentMemories(userId: string, limit = 20) {
  const memories = await listMemoriesByUser(userId, limit);
  return memories.map((m) => ({ content: m.content, importance: m.importance }));
}
