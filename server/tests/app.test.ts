import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';

const app = createApp();

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Health API', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Auth API', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `test-${Date.now()}`, password: 'password123' })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects duplicate username', async () => {
    const username = `dup-${Date.now()}`;
    await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'password123' })
      .expect(409);
    expect(res.body.success).toBe(false);
  });

  it('logs in existing user', async () => {
    const username = `login-${Date.now()}`;
    await request(app)
      .post('/api/auth/register')
      .send({ username, password: 'password123' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'password123' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(username);
  });
});

describe('Chat API', () => {
  let authToken: string;

  beforeAll(async () => {
    const { token } = await registerAndLogin();
    authToken = token;
  });

  it('lists providers', async () => {
    const res = await request(app).get('/api/chat/providers').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('creates a session', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('lists sessions', async () => {
    await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const res = await request(app)
      .get('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('rejects unauthenticated chat requests', async () => {
    await request(app).post('/api/chat/sessions').expect(401);
  });

  it('deletes a session', async () => {
    const sessionRes = await request(app)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const sessionId = sessionRes.body.data.id;

    await request(app)
      .delete(`/api/chat/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const listRes = await request(app)
      .get('/api/chat/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const ids = listRes.body.data.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(sessionId);
  });
});

afterAll(async () => {
  await closeDb();
});
