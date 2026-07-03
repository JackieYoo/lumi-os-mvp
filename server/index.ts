import { startServer } from './app.js';
import { getDb } from './db/connection.js';
import { restorePersistedServers } from './mcp/manager.js';
import { logger } from './lib/logger.js';
import { startScheduler, stopScheduler } from './tasks/scheduler.js';
import { resetRunningTasks } from './tasks/db.js';

async function main(): Promise<void> {
  // Ensure database is ready before accepting requests
  await getDb();

  // Restore MCP servers from previous sessions
  await restorePersistedServers();

  // Recover any tasks left running from a previous crash
  await resetRunningTasks();

  // Start background task scheduler
  startScheduler();

  const server = startServer();

  process.on('SIGTERM', () => {
    stopScheduler();
    server.close(() => {
      process.exit(0);
    });
  });
}

main().catch((err) => {
  logger.error('Failed to start server:', { error: String(err) });
  process.exit(1);
});
