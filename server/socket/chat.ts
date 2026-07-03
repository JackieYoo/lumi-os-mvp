import { getIO } from './index.js';

export function emitChatEvent(sessionId: string, event: unknown): void {
  try {
    const io = getIO();
    io.to(`session:${sessionId}`).emit('chat:event', event);
  } catch {
    // Socket.IO not initialized; ignore
  }
}
