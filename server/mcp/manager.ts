import { logger } from '../lib/logger.js';
import { MCPClient } from './client.js';
import { MCPServerConfig } from './types.js';
import {
  listMCPServers,
  saveMCPServer,
  deleteMCPServer,
  recordToConfig,
} from '../db/mcp.js';
import { registerMCPTool, unregisterServerTools } from './tools.js';

const clients = new Map<string, MCPClient>();

export async function addServer(config: MCPServerConfig): Promise<MCPClient> {
  // Disconnect existing if any
  removeServer(config.name);

  const client = new MCPClient(config);
  await client.connect();

  const tools = await client.listTools();
  for (const tool of tools) {
    registerMCPTool(config.name, tool, client);
  }

  clients.set(config.name, client);
  await saveMCPServer(config);

  logger.info('MCP server added and tools registered', {
    name: config.name,
    toolCount: tools.length,
  });

  return client;
}

export async function removeServer(name: string): Promise<void> {
  const client = clients.get(name);
  if (client) {
    clients.delete(name);
    unregisterServerTools(name);
    await client.disconnect().catch((err) => {
      logger.warn('Error disconnecting MCP server', { name, error: err.message });
    });
  }
}

export async function deleteServer(name: string): Promise<void> {
  await removeServer(name);
  await deleteMCPServer(name);
}

export function listServers(): string[] {
  return Array.from(clients.keys());
}

export function getClient(name: string): MCPClient | undefined {
  return clients.get(name);
}

export async function listAllTools() {
  const results = [];
  for (const [name, client] of clients) {
    const tools = await client.listTools();
    results.push({ server: name, tools });
  }
  return results;
}

export async function restorePersistedServers(): Promise<void> {
  try {
    const records = await listMCPServers();
    for (const record of records) {
      const config = recordToConfig(record);
      try {
        await addServer(config);
      } catch (err) {
        logger.error('Failed to restore MCP server', {
          name: config.name,
          error: (err as Error).message,
        });
      }
    }
  } catch (err) {
    logger.error('Failed to load persisted MCP servers', { error: (err as Error).message });
  }
}
