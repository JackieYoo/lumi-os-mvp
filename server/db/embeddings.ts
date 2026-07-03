import { getDb } from './connection.js';

export interface MemoryEmbeddingRecord {
  memory_id: string;
  user_id: string;
  embedding_json: string;
  created_at: string;
}

export async function saveMemoryEmbedding(
  memoryId: string,
  userId: string,
  embedding: number[],
): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO memory_embeddings (memory_id, user_id, embedding_json, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(memory_id) DO UPDATE SET embedding_json = excluded.embedding_json`,
    memoryId,
    userId,
    JSON.stringify(embedding),
    new Date().toISOString(),
  );
}

export async function listMemoryEmbeddings(userId: string): Promise<MemoryEmbeddingRecord[]> {
  const db = await getDb();
  return db.all<MemoryEmbeddingRecord[]>(
    'SELECT * FROM memory_embeddings WHERE user_id = ?',
    userId,
  );
}

export async function getMemoryEmbedding(memoryId: string): Promise<MemoryEmbeddingRecord | undefined> {
  const db = await getDb();
  return db.get<MemoryEmbeddingRecord>(
    'SELECT * FROM memory_embeddings WHERE memory_id = ?',
    memoryId,
  );
}

export async function deleteMemoryEmbedding(memoryId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM memory_embeddings WHERE memory_id = ?', memoryId);
}
