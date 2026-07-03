import { getIO } from './index.js';

export function emitTaskUpdate(
  userId: string,
  payload: { taskId: string; status: string; summary?: string; error?: string },
): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('task:update', payload);
  } catch {
    // Socket.IO not initialized; ignore
  }
}

export function emitTaskStepUpdate(
  userId: string,
  payload: {
    taskId: string;
    stepId: string;
    status: string;
    result?: unknown;
    error?: string;
  },
): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('task:step_update', payload);
  } catch {
    // ignore
  }
}
