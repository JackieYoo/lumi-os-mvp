import { spawn, ChildProcess } from 'child_process';
import { logger } from '../lib/logger.js';
import type { JsonRpcMessage } from './protocol.js';
import type { MCPTransport } from './transport.js';

export interface StdioTransportConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export class StdioMCPTransport implements MCPTransport {
  private process: ChildProcess | null = null;
  private buffer = '';
  private messageCallback: ((message: JsonRpcMessage) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private closeCallback: (() => void) | null = null;

  constructor(private readonly config: StdioTransportConfig) {}

  onMessage(callback: (message: JsonRpcMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  async connect(): Promise<void> {
    if (this.process) {
      throw new Error('Stdio transport already connected');
    }

    const { command, args = [], env = {} } = this.config;
    const fullEnv = { ...process.env, ...env };

    this.process = spawn(command, args, {
      env: fullEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout?.setEncoding('utf8');
    this.process.stdout?.on('data', (chunk: string) => {
      this.buffer += chunk;
      this.flushBuffer();
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      logger.warn(`MCP stdio stderr: ${chunk.toString().trim()}`);
    });

    this.process.on('error', (err) => {
      logger.error('MCP stdio process error', { error: err.message });
      this.errorCallback?.(err);
    });

    this.process.on('close', (code) => {
      logger.info(`MCP stdio process closed with code ${code}`);
      this.process = null;
      this.closeCallback?.();
    });
  }

  async disconnect(): Promise<void> {
    if (!this.process) return;

    this.process.stdin?.end();
    this.process.kill('SIGTERM');

    // Force kill after timeout
    setTimeout(() => {
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }, 5000).unref();
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.process?.stdin?.writable) {
      throw new Error('Stdio transport not connected');
    }

    const line = JSON.stringify(message) + '\n';
    this.process.stdin.write(line, 'utf8');
  }

  private flushBuffer(): void {
    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message = JSON.parse(trimmed) as JsonRpcMessage;
        this.messageCallback?.(message);
      } catch (err) {
        logger.warn('Failed to parse MCP stdio message', {
          line: trimmed.slice(0, 200),
          error: (err as Error).message,
        });
      }
    }
  }
}
