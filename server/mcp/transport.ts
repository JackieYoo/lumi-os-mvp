import type { JsonRpcMessage } from './protocol.js';

export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JsonRpcMessage): Promise<void>;
  onMessage(callback: (message: JsonRpcMessage) => void): void;
  onError(callback: (error: Error) => void): void;
  onClose(callback: () => void): void;
}
