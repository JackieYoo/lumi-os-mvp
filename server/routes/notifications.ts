import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countUnread,
} from '../db/notifications.js';
import { emitNotificationRead } from '../socket/notifications.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const notifications = await listNotifications(req.user!.id, limit);
    res.json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: !!n.read,
        data: n.data_json ? (JSON.parse(n.data_json) as Record<string, unknown>) : undefined,
        createdAt: n.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

notificationRouter.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const count = await countUnread(req.user!.id);
    res.json({ success: true, data: count });
  } catch (err) {
    next(err);
  }
});

notificationRouter.post('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    await markAsRead(req.user!.id, req.params.id);
    emitNotificationRead(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

notificationRouter.post('/read-all', async (req: AuthRequest, res, next) => {
  try {
    await markAllAsRead(req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

notificationRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await deleteNotification(req.user!.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
