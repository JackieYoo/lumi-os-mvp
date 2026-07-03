import { describe, it, expect } from 'vitest';
import {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countUnread,
} from '../db/notifications.js';

describe('Notification DB', () => {
  const userId = 'notif-test-user';

  it('creates and lists notifications', async () => {
    await createNotification({
      userId,
      type: 'test',
      title: 'Test Title',
      body: 'Test Body',
      data: { foo: 'bar' },
    });

    const notifications = await listNotifications(userId);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].title).toBe('Test Title');
    expect(notifications[0].read).toBe(0);
  });

  it('counts unread notifications', async () => {
    const before = await countUnread(userId);
    await createNotification({
      userId,
      type: 'test',
      title: 'Unread',
      body: 'Body',
    });
    const after = await countUnread(userId);
    expect(after).toBe(before + 1);
  });

  it('marks a notification as read', async () => {
    const notification = await createNotification({
      userId,
      type: 'test',
      title: 'To Read',
      body: 'Body',
    });

    await markAsRead(userId, notification.id);
    const notifications = await listNotifications(userId);
    const found = notifications.find((n) => n.id === notification.id);
    expect(found?.read).toBe(1);
  });

  it('marks all notifications as read', async () => {
    await createNotification({ userId, type: 'test', title: 'A', body: 'B' });
    await markAllAsRead(userId);
    const count = await countUnread(userId);
    expect(count).toBe(0);
  });

  it('deletes a notification', async () => {
    const notification = await createNotification({
      userId,
      type: 'test',
      title: 'To Delete',
      body: 'Body',
    });

    await deleteNotification(userId, notification.id);
    const notifications = await listNotifications(userId);
    expect(notifications.find((n) => n.id === notification.id)).toBeUndefined();
  });
});
