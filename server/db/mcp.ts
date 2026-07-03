import { getDb } from './connection.js';
import { MCPServerRecord } from './types.js';
import { MCPServerConfig } from '../mcp/types.js';

export async function listMCPServers(): Promise<MCPServerRecord[]> {
  const db = await getDb();
  return db.all<MCPServerRecord[]>('SELECT * FROM mcp_servers ORDER BY created_at DESC');
}

export async function getMCPServer(name: string): Promise<MCPServerRecord | undefined> {
  const db = await getDb();
  return db.get<MCPServerRecord>('SELECT * FROM mcp_servers WHERE name = ?', name);
}

export async function saveMCPServer(config: MCPServerConfig): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO mcp_servers (name, command, args, env, url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       command = excluded.command,
       args = excluded.args,
       env = excluded.env,
       url = excluded.url,
       updated_at = excluded.updated_at`,
    config.name,
    config.command || null,
    config.args ? JSON.stringify(config.args) : null,
    config.env ? JSON.stringify(config.env) : null,
    config.url || null,
    now,
    now,
  );
}

export async function deleteMCPServer(name: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM mcp_servers WHERE name = ?', name);
}

export function recordToConfig(record: MCPServerRecord): MCPServerConfig {
  return {
    name: record.name,
    command: record.command || undefined,
    args: record.args ? (JSON.parse(record.args) as string[]) : undefined,
    env: record.env ? (JSON.parse(record.env) as Record<string, string>) : undefined,
    url: record.url || undefined,
  };
}
