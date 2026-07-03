import { getDb } from './connection.js';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: number;
  data_json: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const MAX_NOTIFICATIONS = 200;

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO notifications (id, user_id, type, title, body, read, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.userId,
    input.type,
    input.title,
    input.body,
    input.data ? JSON.stringify(input.data) : null,
    now,
  );

  // Keep notification count bounded per user
  const count = await db.get<{ total: number }>(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
    input.userId,
  );
  if (count && count.total > MAX_NOTIFICATIONS) {
    await db.run(
      `DELETE FROM notifications WHERE id IN (
         SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET ?
       )`,
      input.userId,
      MAX_NOTIFICATIONS,
    );
  }

  return {
    id,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: 0,
    data_json: input.data ? JSON.stringify(input.data) : null,
    created_at: now,
  };
}

export async function listNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  return db.all<Notification[]>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    userId,
    limit,
  );
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
    notificationId,
    userId,
  );
}

export async function markAllAsRead(userId: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', userId);
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', notificationId, userId);
}

export async function countUnread(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.get<{ total: number }>(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND read = 0',
    userId,
  );
  return row?.total || 0;
}
