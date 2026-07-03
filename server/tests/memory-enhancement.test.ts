import { describe, it, expect, vi } from 'vitest';
import { consolidateMemories } from '../memory/consolidation.js';
import { generateMemoryAvatar } from '../memory/avatar.js';
import { extractRelationships } from '../memory/relationships.js';
import * as llmRouter from '../llm/router.js';
import * as messagesDb from '../db/messages.js';
import * as memoriesDb from '../db/memories.js';

vi.mock('../llm/router.js', () => ({
  completeLLM: vi.fn(),
  getProvider: vi.fn().mockReturnValue({ isAvailable: () => true }),
}));

describe('Memory Enhancement', () => {
  const userId = 'memory-enhancement-test-user';

  it('consolidates duplicate memories', async () => {
    const createMemory = vi.spyOn(memoriesDb, 'createMemory');
    createMemory.mockResolvedValue();

    const result = await consolidateMemories(userId);
    expect(typeof result.merged).toBe('number');
    expect(typeof result.decayed).toBe('number');

    createMemory.mockRestore();
  });

  it('extracts relationships from transcript', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify([
        {
          name: 'Alice',
          relationType: 'friend',
          summary: 'College roommate',
        },
      ]),
      finishReason: 'stop',
    });

    const relationships = await extractRelationships(userId, 'user: I had coffee with Alice today.');
    expect(relationships.length).toBe(1);
    expect(relationships[0].name).toBe('Alice');
  });

  it('generates memory avatar', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify({
        summary: 'A curious and warm user.',
        values: ['curiosity', 'warmth'],
        voiceNotes: 'Speak gently.',
      }),
      finishReason: 'stop',
    });

    vi.spyOn(messagesDb, 'listMessagesBySession');
    vi.spyOn(memoriesDb, 'listMemoriesByUser').mockResolvedValue([
      {
        id: '1',
        user_id: userId,
        content: 'I love hiking',
        importance: 7,
        embedding_json: null,
        source: null,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
    ] as Awaited<ReturnType<typeof memoriesDb.listMemoriesByUser>>);

    const avatar = await generateMemoryAvatar(userId, 'openai');
    expect(avatar).not.toBeNull();
    expect(avatar?.summary).toContain('curious');
  });
});
