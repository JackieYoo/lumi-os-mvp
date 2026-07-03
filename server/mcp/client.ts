import { logger } from '../lib/logger.js';
import { MCPServerConfig, MCPTool } from './types.js';
import {
  createRequest,
  createNotification,
  isSuccessResponse,
  isErrorResponse,
  JsonRpcMessage,
  MCPToolDefinition,
  MCPToolListResult,
  MCPToolCallResult,
} from './protocol.js';
import { StdioMCPTransport } from './stdio-client.js';
import { SseMcpTransport } from './sse-client.js';
import type { MCPTransport } from './transport.js';

const MCP_PROTOCOL_VERSION = '2024-11-05';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export class MCPClient {
  private transport: MCPTransport;
  private pendingRequests = new Map<number | string, PendingRequest>();
  private initialized = false;
  private tools: MCPToolDefinition[] = [];

  constructor(
    public readonly config: MCPServerConfig,
    transport?: MCPTransport,
  ) {
    if (transport) {
      this.transport = transport;
    } else if (config.url) {
      this.transport = new SseMcpTransport({ url: config.url });
    } else if (config.command) {
      this.transport = new StdioMCPTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });
    } else {
      throw new Error('MCP server config must specify either command or url');
    }

    this.transport.onMessage((message) => this.handleMessage(message));
    this.transport.onError((error) => this.handleError(error));
    this.transport.onClose(() => this.handleClose());
  }

  async connect(): Promise<void> {
    await this.transport.connect();

    const initRequest = createRequest('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'lumi-os-mvp',
        version: '0.1.0',
      },
    });

    const initResult = (await this.request(initRequest)) as {
      protocolVersion?: string;
      capabilities?: Record<string, unknown>;
    };

    logger.info('MCP server initialized', {
      name: this.config.name,
      protocolVersion: initResult?.protocolVersion,
    });

    const initializedNotification = createNotification('notifications/initialized');
    await this.transport.send(initializedNotification);

    this.initialized = true;
  }

  async disconnect(): Promise<void> {
    this.initialized = false;
    await this.transport.disconnect();
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('MCP connection closed'));
    }
    this.pendingRequests.clear();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    const request = createRequest('tools/list');
    const result = (await this.request(request)) as MCPToolListResult;

    this.tools = result?.tools || [];

    return this.tools.map((tool) => ({
      server: this.config.name,
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    const request = createRequest('tools/call', { name, arguments: args });
    const result = (await this.request(request)) as MCPToolCallResult;

    if (result?.isError) {
      throw new Error(
        result.content?.map((c) => (c.type === 'text' ? c.text : JSON.stringify(c))).join('\n') ||
          'MCP tool returned an error',
      );
    }

    const textParts = result?.content
      ?.filter((c) => c.type === 'text')
      .map((c) => c.text)
      .filter(Boolean);

    if (textParts && textParts.length > 0) {
      return { result: textParts.join('\n') };
    }

    return result || { result: null };
  }

  private request(message: JsonRpcMessage & { id: number | string }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(message.id, { resolve, reject });

      this.transport
        .send(message)
        .catch((err) => {
          this.pendingRequests.delete(message.id);
          reject(err);
        });
    });
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (isSuccessResponse(message) || isErrorResponse(message)) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) return;

      this.pendingRequests.delete(message.id);

      if (isErrorResponse(message)) {
        pending.reject(new Error(`${message.error.message} (code ${message.error.code})`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleError(error: Error): void {
    logger.error('MCP transport error', {
      name: this.config.name,
      error: error.message,
    });
  }

  private handleClose(): void {
    this.initialized = false;
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('MCP connection closed'));
    }
    this.pendingRequests.clear();
  }
}
