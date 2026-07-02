import { startServer } from './app.js';
import { getDb } from './db/connection.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  // Ensure database is ready before accepting requests
  await getDb();
  startServer();
}

main().catch((err) => {
  logger.error('Failed to start server:', { error: String(err) });
  process.exit(1);
});
