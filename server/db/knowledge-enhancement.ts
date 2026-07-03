import { getDb } from './connection.js';

export interface KnowledgeChunkRecord {
  id: string;
  user_id: string;
  file_id: string;
  chunk_index: number;
  total_chunks: number;
  content: string;
  embedding_json: string | null;
  created_at: string;
}

export async function createKnowledgeChunk(
  chunk: KnowledgeChunkRecord,
): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO knowledge_chunks (id, user_id, file_id, chunk_index, total_chunks, content, embedding_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    chunk.id,
    chunk.user_id,
    chunk.file_id,
    chunk.chunk_index,
    chunk.total_chunks,
    chunk.content,
    chunk.embedding_json,
    chunk.created_at,
  );
}

export async function listKnowledgeChunksByUser(userId: string): Promise<KnowledgeChunkRecord[]> {
  const db = await getDb();
  return db.all<KnowledgeChunkRecord[]>(
    'SELECT * FROM knowledge_chunks WHERE user_id = ? ORDER BY file_id, chunk_index',
    userId,
  );
}

export async function deleteKnowledgeChunksByFile(fileId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM knowledge_chunks WHERE file_id = ?', fileId);
}

export interface KnowledgeEntityRecord {
  id: string;
  user_id: string;
  file_id: string;
  name: string;
  entity_type: string | null;
  mentions: number;
  created_at: string;
  updated_at: string;
}

export async function upsertKnowledgeEntity(
  entity: Omit<KnowledgeEntityRecord, 'id' | 'created_at' | 'updated_at' | 'mentions'> & { id?: string },
): Promise<void> {
  const db = await getDb();
  const id = entity.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO knowledge_entities (id, user_id, file_id, name, entity_type, mentions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, file_id, name) DO UPDATE SET
       mentions = mentions + 1,
       entity_type = COALESCE(excluded.entity_type, entity_type),
       updated_at = excluded.updated_at`,
    id,
    entity.user_id,
    entity.file_id,
    entity.name,
    entity.entity_type || null,
    now,
    now,
  );
}

export async function listKnowledgeEntitiesByUser(userId: string): Promise<KnowledgeEntityRecord[]> {
  const db = await getDb();
  return db.all<KnowledgeEntityRecord[]>(
    'SELECT * FROM knowledge_entities WHERE user_id = ? ORDER BY mentions DESC',
    userId,
  );
}

export async function deleteKnowledgeEntitiesByFile(fileId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM knowledge_entities WHERE file_id = ?', fileId);
}
