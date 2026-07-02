import { getDb } from './connection.js';
import { User } from './types.js';

export async function createUser(user: User): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO users (id, username, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, user.username, user.password_hash, user.created_at, user.updated_at]
  );
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  return db.get<User>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  return db.get<User>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM users WHERE id = ?', [id]);
}
