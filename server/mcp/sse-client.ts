import { logger } from '../lib/logger.js';
import type { JsonRpcMessage } from './protocol.js';
import type { MCPTransport } from './transport.js';

export interface SSETransportConfig {
  url: string;
  headers?: Record<string, string>;
}

export class SseMcpTransport implements MCPTransport {
  private abortController: AbortController | null = null;
  private postUrl: string | null = null;
  private messageCallback: ((message: JsonRpcMessage) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private closeCallback: (() => void) | null = null;

  constructor(private readonly config: SSETransportConfig) {}

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
    if (this.abortController) {
      throw new Error('SSE transport already connected');
    }

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...this.config.headers,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('SSE response has no readable body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = async (): Promise<void> => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = this.parseSSEEvents(buffer);
            buffer = events.remainder;

            for (const event of events.parsed) {
              this.handleSSEEvent(event);
            }
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            this.errorCallback?.(err as Error);
          }
        } finally {
          this.closeCallback?.();
          this.abortController = null;
        }
      };

      void read();
    } catch (err) {
      this.abortController = null;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.abortController?.abort();
    this.abortController = null;
  }

  async send(message: JsonRpcMessage): Promise<void> {
    const url = this.postUrl || this.config.url;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`SSE POST failed: ${response.status} ${response.statusText}`);
    }
  }

  private parseSSEEvents(buffer: string): { parsed: Array<{ event: string; data: string }>; remainder: string } {
    const parsed: Array<{ event: string; data: string }> = [];
    const lines = buffer.split('\n');
    const remainder = lines.pop() || '';

    let currentEvent = 'message';
    let currentData = '';

    const flushEvent = () => {
      if (currentData) {
        parsed.push({ event: currentEvent, data: currentData });
        currentData = '';
        currentEvent = 'message';
      }
    };

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        if (currentData) currentData += '\n';
        currentData += line.slice(5).trimStart();
      } else if (line.trim() === '') {
        flushEvent();
      }
    }

    flushEvent();
    return { parsed, remainder };
  }

  private handleSSEEvent(event: { event: string; data: string }): void {
    if (event.event === 'endpoint') {
      const endpoint = event.data.trim();
      this.postUrl = endpoint.startsWith('http')
        ? endpoint
        : new URL(endpoint, this.config.url).toString();
      return;
    }

    try {
      const message = JSON.parse(event.data) as JsonRpcMessage;
      this.messageCallback?.(message);
    } catch (err) {
      logger.warn('Failed to parse MCP SSE message', {
        data: event.data.slice(0, 200),
        error: (err as Error).message,
      });
    }
  }
}
