import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';
import * as planner from '../tasks/planner.js';
import * as engine from '../tasks/engine.js';

vi.mock('../tasks/planner.js', () => ({
  planTask: vi.fn(),
}));

vi.mock('../tasks/engine.js', () => ({
  executeTask: vi.fn().mockResolvedValue(undefined),
  cancelRunningTask: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `tasks-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Tasks API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const creds = await registerAndLogin();
    authToken = creds.token;
    userId = creds.userId;
  });

  it('creates a task from a goal', async () => {
    vi.mocked(planner.planTask).mockResolvedValue({
      title: 'Research topic',
      description: 'Search and summarize',
      steps: [
        { description: 'Search web', toolName: 'web_search', toolArgs: { query: 'topic' } },
        { description: 'Summarize' },
      ],
    });

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ goal: 'Research topic' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Research topic');
    expect(res.body.data.steps).toHaveLength(2);
    expect(res.body.data.status).toBe('pending');
  });

  it('lists tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('gets task details', async () => {
    vi.mocked(planner.planTask).mockResolvedValue({
      title: 'Detail task',
      description: 'Detail',
      steps: [{ description: 'Step 1' }],
    });

    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ goal: 'Detail task' })
      .expect(201);

    const taskId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(taskId);
    expect(res.body.data.steps).toHaveLength(1);
  });

  it('runs a task', async () => {
    vi.mocked(planner.planTask).mockResolvedValue({
      title: 'Runnable task',
      description: 'Run',
      steps: [{ description: 'Step 1' }],
    });

    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ goal: 'Runnable task' })
      .expect(201);

    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(`/api/tasks/${taskId}/run`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(engine.executeTask).toHaveBeenCalledWith(taskId);
  });

  it('deletes a task', async () => {
    vi.mocked(planner.planTask).mockResolvedValue({
      title: 'Deletable task',
      description: 'Delete',
      steps: [{ description: 'Step 1' }],
    });

    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ goal: 'Deletable task' })
      .expect(201);

    const taskId = createRes.body.data.id;

    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app).get('/api/tasks').expect(401);
  });

  afterAll(async () => {
    await closeDb();
  });
});
