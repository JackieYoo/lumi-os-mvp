import { io, Socket } from 'socket.io-client';
import { getToken } from './api.js';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getToken();
    socket = io({
      path: '/socket.io',
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      // connected
    });

    socket.on('disconnect', () => {
      // disconnected
    });

    socket.on('connect_error', () => {
      // connection error handled by reconnection logic
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeSession(sessionId: string): void {
  getSocket().emit('subscribe:session', sessionId);
}

export function unsubscribeSession(sessionId: string): void {
  getSocket().emit('unsubscribe:session', sessionId);
}
