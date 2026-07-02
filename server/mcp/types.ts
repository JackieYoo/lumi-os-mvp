export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface MCPTool {
  server: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
