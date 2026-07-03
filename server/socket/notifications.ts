import { getIO } from './index.js';

export function emitNotification(userId: string, notification: unknown): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification', notification);
  } catch {
    // Socket.IO not initialized; ignore
  }
}

export function emitNotificationRead(userId: string, notificationId: string): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:read', { notificationId });
  } catch {
    // ignore
  }
}
