import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { closeDb } from '../db/connection.js';

const app = createApp();

vi.mock('openai', () => {
  const MockOpenAI = class {
    audio = {
      transcriptions: {
        create: vi.fn().mockResolvedValue({ text: '  hello world  ' }),
      },
      speech: {
        create: vi.fn().mockResolvedValue({
          arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        }),
      },
    };
  };

  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
    toFile: vi.fn().mockResolvedValue(new File([], 'recording.webm')),
  };
});

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const username = `voice-test-${Date.now()}`;
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'password123' })
    .expect(201);

  return {
    token: registerRes.body.data.token,
    userId: registerRes.body.data.user.id,
  };
}

describe('Voice API', () => {
  let authToken: string;

  beforeAll(async () => {
    const { token } = await registerAndLogin();
    authToken = token;
  });

  it('returns voice service status', async () => {
    const res = await request(app)
      .get('/api/voice/status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('stt');
    expect(res.body.data).toHaveProperty('tts');
  });

  it('rejects unauthenticated voice requests', async () => {
    await request(app).get('/api/voice/status').expect(401);
  });

  it('transcribes audio', async () => {
    const res = await request(app)
      .post('/api/voice/stt')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('audio', Buffer.from('fake-audio'), { filename: 'recording.webm', contentType: 'audio/webm' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBe('hello world');
  });

  it('rejects STT without audio file', async () => {
    const res = await request(app)
      .post('/api/voice/stt')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('MISSING_AUDIO_FILE');
  });

  it('synthesizes speech', async () => {
    const res = await request(app)
      .post('/api/voice/tts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'hello' })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/audio/);
    expect(res.body).toBeInstanceOf(Buffer);
  });

  it('rejects TTS without text', async () => {
    const res = await request(app)
      .post('/api/voice/tts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('MISSING_TTS_TEXT');
  });

  afterAll(async () => {
    await closeDb();
  });
});
