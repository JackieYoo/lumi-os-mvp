import { getDb } from '../../db/connection.js';

export async function createUser(
  id: string,
  username: string,
  password: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO users (id, username, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       password_hash = excluded.password_hash,
       updated_at = excluded.updated_at`,
    id,
    username,
    password,
    now,
    now,
  );
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM users WHERE id = ?', id);
}
