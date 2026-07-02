import { describe, it, expect, beforeEach } from 'vitest';
import { registerTool, listTools, executeTool, getTool } from '../tools/registry.js';
import '../tools/built-ins/time.js';
import '../tools/built-ins/fileRead.js';
import '../tools/built-ins/webSearch.js';

describe('Tool Registry', () => {
  beforeEach(() => {
    // built-ins are already registered in module scope
  });

  it('lists built-in tools', () => {
    const tools = listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_current_time');
    expect(names).toContain('read_file');
    expect(names).toContain('list_files');
    expect(names).toContain('web_search');
  });

  it('executes time tool', async () => {
    const result = (await executeTool('get_current_time', {})) as {
      iso: string;
      human: string;
    };
    expect(result.iso).toBeDefined();
    expect(new Date(result.iso).getTime()).not.toBeNaN();
  });

  it('rejects path traversal', async () => {
    await expect(executeTool('read_file', { path: '../../../etc/passwd' })).rejects.toThrow();
  });

  it('throws for unknown tool', async () => {
    await expect(executeTool('unknown_tool', {})).rejects.toThrow('Tool not found');
  });

  it('allows custom tool registration', () => {
    registerTool({
      name: 'test_greet',
      description: 'Greet someone',
      parameters: { type: 'object', properties: {} },
      execute: (args) => `Hello ${(args.name as string) || 'world'}`,
    });

    const tool = getTool('test_greet');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('test_greet');
  });
});
