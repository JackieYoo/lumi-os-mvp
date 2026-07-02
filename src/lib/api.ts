import { toast } from 'sonner';

const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function getToken(): string | null {
  return localStorage.getItem('lumi_token');
}

export function setToken(token: string): void {
  localStorage.setItem('lumi_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('lumi_token');
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { skipToast?: boolean }
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !data.success) {
    const message = data.error || `Request failed: ${response.status}`;
    if (!options?.skipToast) {
      toast.error(message);
    }
    throw new Error(message);
  }
  return data.data as T;
}

export async function streamChat(
  body: {
    sessionId?: string;
    message: string;
    provider: string;
    model?: string;
    enableMemory?: boolean;
    enableTools?: boolean;
  },
  onEvent: (event: unknown) => void,
  onDone: () => void,
  onError: (error: Error) => void
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ApiResponse<unknown>;
    throw new Error(data.error || `Chat failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const event = JSON.parse(data);
          onEvent(event);
        } catch {
          // ignore malformed events
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err as Error);
  } finally {
    reader.releaseLock();
  }
}
