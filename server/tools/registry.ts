import { Tool } from './types.js';

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  if (registry.has(tool.name)) {
    throw new Error(`Tool ${tool.name} is already registered`);
  }
  registry.set(tool.name, tool);
}

export function listTools(): Tool[] {
  return Array.from(registry.values());
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = registry.get(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  return tool.execute(args);
}

export function toolsToOpenAIFormat() {
  return listTools().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
