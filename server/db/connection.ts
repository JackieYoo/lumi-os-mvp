import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

let db: Database < sqlite3.Database, sqlite3.Statement > | null = null;
let initPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dbDir = path.dirname(config.DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const connection = await open({
      filename: config.DATABASE_PATH,
      driver: sqlite3.Database,
    });

    await connection.exec(SCHEMA);
    await runMigrations(connection);
    logger.info('Database initialized', { path: config.DATABASE_PATH });
    db = connection;
    return connection;
  })();

  return initPromise;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    initPromise = null;
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT,
  tool_calls TEXT,
  tool_call_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5,
  embedding_json TEXT,
  source TEXT,
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

CREATE TABLE IF NOT EXISTS knowledge_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  display_name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('ready', 'indexing', 'indexed', 'failed')),
  content_preview TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_files_user ON knowledge_files(user_id);
`;

async function runMigrations(connection: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
  const columns = await connection.all<{ name: string }[]>(
    "PRAGMA table_info(memories)"
  );
  const hasSource = columns.some((col) => col.name === 'source');

  if (!hasSource) {
    await connection.exec('ALTER TABLE memories ADD COLUMN source TEXT');
    await connection.exec('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
  }
}
