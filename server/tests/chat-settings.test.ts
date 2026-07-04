import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import * as llmRouter from '../llm/router.js';
import * as toolPreferences from '../db/tool-preferences.js';

const app = createApp();

vi.mock('../llm/router.js', () => ({
  streamLLM: vi.fn().mockImplementation(async (_options, onChunk) => {
    onChunk({ content: 'Hello' });
  }),
  completeLLM: vi.fn().mockResolvedValue({
    content: 'Hello',
    toolCalls: [],
    finishReason: 'stop',
  }),
  listProviders: vi.fn().mockReturnValue(['openai', 'anthropic']),
}));

vi.mock('../db/tool-preferences.js', () => ({
  isToolEnabledForUser: vi.fn().mockResolvedValue(true),
  getUserToolPreferenceMap: vi.fn().mockResolvedValue({}),
}));

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `chat-settings-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Chat settings consumption', () => {
  let authToken: string;
  let sessionId: string;

  beforeEach(async () => {
    const creds = await registerAndLogin();
    authToken = creds.token;

    const sessionRes = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    sessionId = sessionRes.body.data.id;

    await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        enableMemory: false,
        enableTools: false,
      })
      .expect(200);
  });

  it('falls back to server settings when chat request omits provider and toggles', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockClear();

    await request(app)
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId,
        message: 'Hello settings',
      })
      .expect(200);

    expect(completeLLM).toHaveBeenCalled();
    expect(completeLLM.mock.calls[0][0]).toMatchObject({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      tools: undefined,
    });
  });

  it('lets explicit request values override server settings', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockClear();

    await request(app)
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId,
        message: 'Override settings',
        provider: 'openai',
        model: 'gpt-4o-mini',
        enableMemory: true,
        enableTools: true,
      })
      .expect(200);

    expect(completeLLM.mock.calls[0][0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    expect(completeLLM.mock.calls[0][0].tools).toBeDefined();
  });

  it('filters out disabled tools based on user preferences', async () => {
    const prefMap = vi.mocked(toolPreferences.getUserToolPreferenceMap);
    prefMap.mockResolvedValue({ web_search: false });

    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockClear();

    await request(app)
      .post('/api/chat/stream')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId,
        message: 'Search and tell time',
        enableTools: true,
      })
      .expect(200);

    const tools = completeLLM.mock.calls[0][0].tools;
    const toolNames = tools.map((t: { name: string }) => t.name);
    expect(toolNames).not.toContain('web_search');
    expect(toolNames).toContain('get_current_time');
  });

  afterAll(async () => {
    await closeDb();
  });
});
