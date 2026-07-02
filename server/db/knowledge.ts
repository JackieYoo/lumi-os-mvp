import { getDb } from './connection.js';
import { KnowledgeFile } from './types.js';

export async function createKnowledgeFile(file: KnowledgeFile): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO knowledge_files (id, user_id, filename, display_name, size, status, content_preview, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      file.id,
      file.user_id,
      file.filename,
      file.display_name,
      file.size,
      file.status,
      file.content_preview,
      file.created_at,
      file.updated_at,
    ]
  );
}

export async function listKnowledgeFilesByUser(userId: string): Promise<KnowledgeFile[]> {
  const db = await getDb();
  return db.all<KnowledgeFile[]>(
    `SELECT * FROM knowledge_files WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
}

export async function findKnowledgeFileById(
  id: string,
  userId: string
): Promise<KnowledgeFile | undefined> {
  const db = await getDb();
  return db.get<KnowledgeFile>(
    `SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}

export async function updateKnowledgeFileStatus(
  id: string,
  userId: string,
  status: KnowledgeFile['status'],
  preview?: string
): Promise<void> {
  const db = await getDb();
  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const values: (string | number)[] = [status, new Date().toISOString()];

  if (preview !== undefined) {
    updates.push('content_preview = ?');
    values.push(preview);
  }

  values.push(id, userId);

  await db.run(
    `UPDATE knowledge_files SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );
}

export async function deleteKnowledgeFile(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM knowledge_files WHERE id = ? AND user_id = ?', [id, userId]);
}
