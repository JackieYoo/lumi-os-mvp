import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app.js';
import { closeDb, getDb } from '../db/connection.js';

const app = createApp();

vi.mock('pdf-parse-fixed', () => {
  return {
    default: vi.fn().mockResolvedValue({ text: 'Mocked PDF content' }),
  };
});

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `kb-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Knowledge API', () => {
  let authToken: string;

  beforeAll(async () => {
    const { token } = await registerAndLogin();
    authToken = token;
  });

  it('uploads a text file', async () => {
    const res = await request(app)
      .post('/api/knowledge/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('Hello world'), { filename: 'test.txt', contentType: 'text/plain' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].filename).toBe('test.txt');
  });

  it('rejects unsupported file types', async () => {
    const res = await request(app)
      .post('/api/knowledge/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('data'), { filename: 'test.exe', contentType: 'application/octet-stream' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('lists knowledge files', async () => {
    const res = await request(app)
      .get('/api/knowledge/files')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('ingests a file into memories', async () => {
    const uploadRes = await request(app)
      .post('/api/knowledge/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('First paragraph. Second paragraph.'), {
        filename: 'ingest.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const fileId = uploadRes.body.data[0].id;

    const ingestRes = await request(app)
      .post(`/api/knowledge/files/${fileId}/ingest`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(ingestRes.body.success).toBe(true);
    expect(ingestRes.body.data.chunks).toBeGreaterThan(0);

    const db = await getDb();
    const memories = await db.all(
      'SELECT * FROM memories WHERE source = ?',
      ['ingest.txt']
    );
    expect(memories.length).toBeGreaterThan(0);
  });

  it('deletes a knowledge file', async () => {
    const uploadRes = await request(app)
      .post('/api/knowledge/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('files', Buffer.from('delete me'), { filename: 'delete.txt', contentType: 'text/plain' })
      .expect(201);

    const fileId = uploadRes.body.data[0].id;

    await request(app)
      .delete(`/api/knowledge/files/${fileId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .get(`/api/knowledge/files/${fileId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  afterAll(async () => {
    // Clean up uploaded test files
    const uploadDir = path.resolve(process.cwd(), 'data', 'uploads');
    if (fs.existsSync(uploadDir)) {
      for (const file of fs.readdirSync(uploadDir)) {
        if (file.includes('txt')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      }
    }
    await closeDb();
  });
});
