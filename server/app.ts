import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocketIO } from './socket/index.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { memoryRouter } from './routes/memories.js';
import { toolRouter } from './routes/tools.js';
import { mcpRouter } from './routes/mcp.js';
import { voiceRouter } from './routes/voice.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { notificationRouter } from './routes/notifications.js';
import { personalityRouter } from './routes/personality.js';
import { memoryEnhancementRouter } from './routes/memory-enhancement.js';
import { taskRouter } from './routes/tasks.js';

// Register built-in tools
import './tools/built-ins/time.js';
import './tools/built-ins/fileRead.js';
import './tools/built-ins/webSearch.js';
import './tools/built-ins/createTask.js';

// Register bundled skills
import './skills/bundled/weather.js';
import './skills/bundled/calculator.js';
import './skills/bundled/notes.js';
import './skills/bundled/web-search.js';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/memories', memoryRouter);
  app.use('/api/tools', toolRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api/voice', voiceRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/personality', personalityRouter);
  app.use('/api/memory-enhancement', memoryEnhancementRouter);
  app.use('/api/tasks', taskRouter);

  // Static files for production frontend
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handler must be last
  app.use(errorHandler);

  return app;
}

export function createServer(): http.Server {
  const app = createApp();
  const server = http.createServer(app);
  initSocketIO(server);
  return server;
}

export function startServer(): http.Server {
  const server = createServer();
  server.listen(config.PORT, () => {
    logger.info(`LumiOS MVP server running on http://localhost:${config.PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  return server;
}
