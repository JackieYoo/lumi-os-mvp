import { getDb } from './connection.js';
import { Message } from './types.js';

export async function createMessage(message: Message): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO messages (id, session_id, role, content, tool_calls, tool_call_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      message.id,
      message.session_id,
      message.role,
      message.content,
      message.tool_calls,
      message.tool_call_id,
      message.created_at,
    ]
  );
}

export async function listMessagesBySession(sessionId: string): Promise<Message[]> {
  const db = await getDb();
  return db.all<Message[]>(
    `SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId]
  );
}

export async function deleteMessagesBySession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);
}
