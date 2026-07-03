import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../lib/logger.js';
import { verifyToken } from '../lib/auth.js';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function initSocketIO(server: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication error: missing token'));
      }

      const payload = await verifyToken(token);
      socket.data.userId = payload.id;
      socket.data.username = payload.username;
      next();
    } catch (err) {
      logger.warn('Socket.IO auth failed', { error: (err as Error).message });
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.info('Socket connected', { socketId: socket.id, userId });

    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { socketId: socket.id, userId });
    });

    socket.on('subscribe:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('unsubscribe:session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });
  });

  return io;
}

export function closeSocketIO(): void {
  if (io) {
    io.close();
    io = null;
  }
}
