import { describe, it, expect, beforeEach } from 'vitest';
import { MCPClient } from '../mcp/client.js';
import { MCPServerConfig, MCPTool } from '../mcp/types.js';
import {
  JsonRpcMessage,
  createRequest,
  createNotification,
} from '../mcp/protocol.js';
import type { MCPTransport } from '../mcp/transport.js';

class MockTransport implements MCPTransport {
  private messageCallback: ((message: JsonRpcMessage) => void) | null = null;
  private pending: JsonRpcMessage[] = [];
  connected = false;

  onMessage(callback: (message: JsonRpcMessage) => void): void {
    this.messageCallback = callback;
    for (const message of this.pending) {
      callback(message);
    }
    this.pending = [];
  }

  onError(): void {}
  onClose(): void {}

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(message: JsonRpcMessage & { id: number | string }): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    // Simulate server responses
    if ('method' in message && message.method === 'initialize') {
      this.respond(message.id, {
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: { name: 'mock', version: '1.0' },
      });
      return;
    }

    if ('method' in message && message.method === 'notifications/initialized') {
      return;
    }

    if ('method' in message && message.method === 'tools/list') {
      this.respond(message.id, {
        tools: [
          {
            name: 'mock_tool',
            description: 'A mock tool',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      });
      return;
    }

    if ('method' in message && message.method === 'tools/call') {
      this.respond(message.id, {
        content: [{ type: 'text', text: 'mock result' }],
      });
      return;
    }

    this.respond(message.id, {});
  }

  private respond(id: number | string, result: unknown): void {
    const message: JsonRpcMessage = { jsonrpc: '2.0', id, result };
    if (this.messageCallback) {
      this.messageCallback(message);
    } else {
      this.pending.push(message);
    }
  }
}

describe('MCP Client', () => {
  let transport: MockTransport;
  let client: MCPClient;

  beforeEach(() => {
    transport = new MockTransport();
    const config: MCPServerConfig = {
      name: 'mock-server',
      command: 'echo',
      args: [],
    };
    client = new MCPClient(config, transport);
  });

  it('initializes and lists tools', async () => {
    await client.connect();
    expect(client.isInitialized()).toBe(true);

    const tools = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('mock_tool');
    expect(tools[0].server).toBe('mock-server');
  });

  it('calls a tool and returns result', async () => {
    await client.connect();
    const result = await client.callTool('mock_tool', { foo: 'bar' });
    expect(result).toEqual({ result: 'mock result' });
  });

  it('rejects when not initialized', async () => {
    await expect(client.listTools()).rejects.toThrow('MCP client not initialized');
  });
});

describe('MCP Protocol', () => {
  it('creates requests with incrementing ids', () => {
    const req1 = createRequest('initialize', {});
    const req2 = createRequest('tools/list');

    expect(typeof req1.id).toBe('number');
    expect(typeof req2.id).toBe('number');
    expect(req2.id).toBeGreaterThan(req1.id);
  });

  it('creates notifications without id', () => {
    const note = createNotification('notifications/initialized');
    expect(note.jsonrpc).toBe('2.0');
    expect('id' in note).toBe(false);
    expect(note.method).toBe('notifications/initialized');
  });
});

describe('MCP Tool Registry', () => {
  it('registers and lists MCP tools', async () => {
    const { registerMCPTool, listMCPTools, unregisterServerTools } = await import('../mcp/tools.js');
    const dummyClient = new MCPClient({ name: 'dummy', command: 'echo' });

    registerMCPTool('server-a', {
      server: 'server-a',
      name: 'tool_1',
      description: 'First tool',
      inputSchema: { type: 'object', properties: {} },
    } as MCPTool, dummyClient);

    registerMCPTool('server-a', {
      server: 'server-a',
      name: 'tool_2',
      description: 'Second tool',
      inputSchema: { type: 'object', properties: {} },
    } as MCPTool, dummyClient);

    expect(listMCPTools()).toHaveLength(2);

    unregisterServerTools('server-a');
    expect(listMCPTools()).toHaveLength(0);
  });
});
