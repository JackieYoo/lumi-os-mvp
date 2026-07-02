export interface ToolParameter {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<unknown> | unknown;
}
