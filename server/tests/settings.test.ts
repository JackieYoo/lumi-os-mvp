import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';

const app = createApp();

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `settings-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Settings API', () => {
  let authToken: string;

  beforeAll(async () => {
    const creds = await registerAndLogin();
    authToken = creds.token;
  });

  it('returns default settings for a new user', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      provider: 'openai',
      model: null,
      enableMemory: true,
      enableTools: true,
      defaultVoice: null,
      defaultPersonaMode: null,
      notifications: {},
    });
  });

  it('updates user settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        enableMemory: false,
        enableTools: false,
        defaultVoice: 'alloy',
        defaultPersonaMode: 'companion',
        notifications: { taskCompleted: true },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      enableMemory: false,
      enableTools: false,
      defaultVoice: 'alloy',
      defaultPersonaMode: 'companion',
      notifications: { taskCompleted: true },
    });
  });

  it('persists updated settings on subsequent reads', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      enableMemory: false,
      enableTools: false,
      defaultVoice: 'alloy',
      defaultPersonaMode: 'companion',
      notifications: { taskCompleted: true },
    });
  });

  it('rejects unauthenticated requests', async () => {
    await request(app).get('/api/settings').expect(401);
  });

  it('rejects invalid settings payload', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        provider: '',
        enableMemory: 'yes',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  afterAll(async () => {
    await closeDb();
  });
});
