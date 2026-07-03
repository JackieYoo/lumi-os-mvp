import { logger } from '../lib/logger.js';
import { MCPClient } from './client.js';
import { MCPTool } from './types.js';

interface RegisteredMCPTool extends MCPTool {
  client: MCPClient;
  originalName: string;
}

const mcpTools = new Map<string, RegisteredMCPTool>();

export function registerMCPTool(serverName: string, tool: MCPTool, client: MCPClient): void {
  const qualifiedName = `${serverName}__${tool.name}`;
  mcpTools.set(qualifiedName, {
    ...tool,
    name: qualifiedName,
    originalName: tool.name,
    client,
  });
}

export function unregisterServerTools(serverName: string): void {
  for (const [key, tool] of mcpTools) {
    if (tool.server === serverName) {
      mcpTools.delete(key);
    }
  }
}

export function listMCPTools(): MCPTool[] {
  return Array.from(mcpTools.values()).map(({ client, originalName, ...tool }) => tool);
}

export async function executeMCPTool(
  qualifiedName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const tool = mcpTools.get(qualifiedName);
  if (!tool) {
    throw new Error(`MCP tool not found: ${qualifiedName}`);
  }

  try {
    return await tool.client.callTool(tool.originalName, args);
  } catch (err) {
    logger.error('MCP tool execution failed', {
      tool: qualifiedName,
      error: (err as Error).message,
    });
    throw err;
  }
}

export function toOpenAITools(): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return listMCPTools().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}
