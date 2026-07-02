import { getDb } from './connection.js';
import { ChatSession } from './types.js';

export async function createSession(session: ChatSession): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO chat_sessions (id, user_id, title, provider, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [session.id, session.user_id, session.title, session.provider, session.model, session.created_at, session.updated_at]
  );
}

export async function findSessionById(id: string): Promise<ChatSession | undefined> {
  const db = await getDb();
  return db.get<ChatSession>('SELECT * FROM chat_sessions WHERE id = ?', [id]);
}

export async function listSessionsByUser(userId: string, limit = 50): Promise<ChatSession[]> {
  const db = await getDb();
  return db.all<ChatSession[]>(
    `SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`,
    [userId, limit]
  );
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?',
    [title, new Date().toISOString(), id]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM chat_sessions WHERE id = ?', [id]);
}
