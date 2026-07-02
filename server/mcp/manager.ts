import { MCPClient } from './client.js';
import { MCPServerConfig } from './types.js';

const clients = new Map<string, MCPClient>();

export async function addServer(config: MCPServerConfig): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  clients.set(config.name, client);
  return client;
}

export function removeServer(name: string): void {
  const client = clients.get(name);
  if (client) {
    void client.disconnect();
    clients.delete(name);
  }
}

export function listServers(): string[] {
  return Array.from(clients.keys());
}

export async function listAllTools() {
  const results = [];
  for (const [name, client] of clients) {
    const tools = await client.listTools();
    results.push({ server: name, tools });
  }
  return results;
}
