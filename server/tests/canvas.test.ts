import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { handleChatStream } from '../chat/engine.js';
import { closeDb } from '../db/connection.js';
import { createApp } from '../app.js';
import request from 'supertest';

const app = createApp();

vi.mock('../llm/router.js', () => {
  return {
    streamLLM: vi.fn().mockImplementation((_options, onChunk) => {
      onChunk({ content: 'Hello' });
      onChunk({ content: ' world' });
      return Promise.resolve();
    }),
    completeLLM: vi.fn().mockResolvedValue({
      content: '',
      toolCalls: [],
      finishReason: 'stop',
    }),
    listProviders: vi.fn().mockReturnValue(['mock']),
  };
});

vi.mock('../memory/context.js', () => {
  return {
    buildMemoryContext: vi.fn().mockResolvedValue({
      memories: [{ content: 'User likes tea', importance: 7 }],
      summary: 'Relevant memories:\n- User likes tea',
    }),
  };
});

vi.mock('../memory/extractor.js', () => {
  return {
    extractMemories: vi.fn().mockResolvedValue([]),
  };
});

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `canvas-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Canvas Stream Events', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const auth = await registerAndLogin();
    authToken = auth.token;
    userId = auth.userId;
  });

  it('emits memory_retrieval and llm_reasoning events', async () => {
    const sessionRes = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const events: { type: string }[] = [];

    await handleChatStream({
      sessionId: sessionRes.body.data.id,
      userId,
      message: 'What do I like?',
      provider: 'mock',
      enableMemory: true,
      enableTools: false,
      onEvent: (event) => events.push(event),
    });

    const types = events.map((e) => e.type);
    expect(types).toContain('memory_retrieval');
    expect(types).toContain('llm_reasoning');
    expect(types).toContain('delta');
    expect(types).toContain('done');
  });

  afterAll(async () => {
    await closeDb();
  });
});
