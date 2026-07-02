import { MCPServerConfig, MCPTool } from './types.js';

export class MCPClient {
  constructor(public readonly config: MCPServerConfig) {}

  async connect(): Promise<void> {
    // Placeholder: real implementation would spawn stdio or connect SSE
  }

  async disconnect(): Promise<void> {
    // Placeholder
  }

  async listTools(): Promise<MCPTool[]> {
    return [];
  }

  async callTool(_name: string, _args: Record<string, unknown>): Promise<unknown> {
    return { note: 'MCP tool execution is not implemented in this MVP.' };
  }
}
