import { getDb } from './connection.js';
import { Memory } from './types.js';

export async function createMemory(memory: Memory): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO memories (id, user_id, content, importance, embedding_json, source, created_at, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memory.id,
      memory.user_id,
      memory.content,
      memory.importance,
      memory.embedding_json,
      memory.source,
      memory.created_at,
      memory.last_accessed_at,
    ]
  );
}

export async function listMemoriesByUser(userId: string, limit = 100): Promise<Memory[]> {
  const db = await getDb();
  return db.all<Memory[]>(
    `SELECT * FROM memories WHERE user_id = ? ORDER BY last_accessed_at DESC LIMIT ?`,
    [userId, limit]
  );
}

export async function searchMemoriesByKeyword(
  userId: string,
  query: string,
  limit = 5
): Promise<Memory[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  return db.all<Memory[]>(
    `SELECT * FROM memories
     WHERE user_id = ? AND content LIKE ?
     ORDER BY importance DESC, last_accessed_at DESC
     LIMIT ?`,
    [userId, pattern, limit]
  );
}

export async function updateMemoryAccess(id: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE memories SET last_accessed_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

export async function findMemoryById(id: string, userId: string): Promise<Memory | undefined> {
  const db = await getDb();
  return db.get<Memory>('SELECT * FROM memories WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function updateMemory(
  id: string,
  updates: { content?: string; importance?: number }
): Promise<void> {
  const db = await getDb();
  const setClause: string[] = [];
  const values: (string | number)[] = [];

  if (updates.content !== undefined) {
    setClause.push('content = ?');
    values.push(updates.content);
  }
  if (updates.importance !== undefined) {
    setClause.push('importance = ?');
    values.push(updates.importance);
  }
  if (setClause.length === 0) return;

  values.push(id);
  await db.run(
    `UPDATE memories SET ${setClause.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM memories WHERE id = ?', [id]);
}

export async function deleteMemoriesByUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM memories WHERE user_id = ?', [userId]);
}
