import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import { createUser, deleteUser } from './helpers/auth.js';
import {
  getUserToolPreferences,
  setUserToolPreference,
  isToolEnabledForUser,
  bulkSetUserToolPreferences,
} from '../db/tool-preferences.js';

const app = createApp();

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `tp-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Tool Preferences DB', () => {
  const userId = `tp-db-test-${Date.now()}`;

  beforeAll(async () => {
    await createUser(userId, 'tp-test-user', 'password123');
  });

  it('returns empty preferences for a new user', async () => {
    const prefs = await getUserToolPreferences(userId);
    expect(prefs).toHaveLength(0);
  });

  it('defaults to enabled when no preference exists', async () => {
    const enabled = await isToolEnabledForUser(userId, 'get_current_time');
    expect(enabled).toBe(true);
  });

  it('sets and retrieves a preference', async () => {
    await setUserToolPreference(userId, 'web_search', false, 'builtin');
    const prefs = await getUserToolPreferences(userId);
    expect(prefs).toHaveLength(1);
    expect(prefs[0].toolName).toBe('web_search');
    expect(prefs[0].enabled).toBe(false);
    expect(prefs[0].source).toBe('builtin');

    const enabled = await isToolEnabledForUser(userId, 'web_search');
    expect(enabled).toBe(false);
  });

  it('updates an existing preference', async () => {
    await setUserToolPreference(userId, 'web_search', false);
    await setUserToolPreference(userId, 'web_search', true);
    const enabled = await isToolEnabledForUser(userId, 'web_search');
    expect(enabled).toBe(true);
  });

  it('handles MCP tool preferences with qualified names', async () => {
    await setUserToolPreference(userId, 'serverA__tool1', false, 'mcp');
    const enabled = await isToolEnabledForUser(userId, 'serverA__tool1');
    expect(enabled).toBe(false);
  });

  it('bulk sets preferences', async () => {
    await bulkSetUserToolPreferences(userId, [
      { toolName: 'bulk_tool1', enabled: false },
      { toolName: 'bulk_tool2', enabled: true, source: 'mcp' },
    ]);
    const prefs = await getUserToolPreferences(userId);
    const map = Object.fromEntries(prefs.map((p) => [p.toolName, p]));
    expect(map.bulk_tool1?.enabled).toBe(false);
    expect(map.bulk_tool2?.enabled).toBe(true);
    expect(map.bulk_tool2?.source).toBe('mcp');
  });

  afterAll(async () => {
    await deleteUser(userId);
    await closeDb();
  });
});

describe('Tool Preferences API', () => {
  let authToken: string;

  beforeAll(async () => {
    const creds = await registerAndLogin();
    authToken = creds.token;
  });

  it('GET /api/tools/preferences returns empty for new user', async () => {
    const res = await request(app)
      .get('/api/tools/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('PUT /api/tools/preferences creates a preference', async () => {
    const res = await request(app)
      .put('/api/tools/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ toolName: 'web_search', enabled: false })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.toolName).toBe('web_search');
    expect(res.body.data.enabled).toBe(false);
    expect(res.body.data.source).toBe('builtin');
  });

  it('GET returns persisted preferences after update', async () => {
    const res = await request(app)
      .get('/api/tools/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body.data.some((p: { toolName: string; enabled: boolean }) => p.toolName === 'web_search' && !p.enabled)).toBe(true);
  });

  it('PUT with MCP source works', async () => {
    const res = await request(app)
      .put('/api/tools/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ toolName: 'server__tool', enabled: false, source: 'mcp' })
      .expect(200);
    expect(res.body.data.source).toBe('mcp');
  });

  it('rejects invalid payload with 400', async () => {
    const res = await request(app)
      .put('/api/tools/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ toolName: '', enabled: 'yes' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unauthenticated requests', async () => {
    await request(app).get('/api/tools/preferences').expect(401);
    await request(app)
      .put('/api/tools/preferences')
      .send({ toolName: 'x', enabled: true })
      .expect(401);
  });

  afterAll(async () => {
    await closeDb();
  });
});
