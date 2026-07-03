import { describe, it, expect, vi } from 'vitest';
import {
  buildPersonalityContext,
  evolveFromChat,
  incubateFromChatLogs,
} from '../personality/engine.js';
import { getOrCreatePersonalityProfile } from '../db/personality.js';
import { DEFAULT_PERSONALITY_VECTOR } from '../personality/types.js';
import * as llmRouter from '../llm/router.js';
import * as messagesDb from '../db/messages.js';

vi.mock('../llm/router.js', () => ({
  completeLLM: vi.fn(),
}));

describe('Personality Engine', () => {
  const userId = 'personality-test-user';

  it('builds personality context from profile', () => {
    const profile = {
      userId,
      vector: { ...DEFAULT_PERSONALITY_VECTOR, warmth: 80 },
      emotionalState: { valence: 0.5, arousal: 0.4, mood: 'happy' },
      cognitive: { thinkingVsFeeling: 0.2, intuitionVsSensing: -0.3 },
      traits: ['optimistic'],
      updatedAt: new Date().toISOString(),
    };

    const context = buildPersonalityContext(profile);
    expect(context).toContain('warmth: 80');
    expect(context).toContain('happy');
    expect(context).toContain('optimistic');
  });

  it('evolves personality from chat', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify({
        vectorDelta: { warmth: 5, curiosity: -2 },
        emotionalState: { valence: 0.6, arousal: 0.5, mood: 'excited' },
        newTraits: ['curious'],
        reasoning: 'test',
      }),
      finishReason: 'stop',
    });

    vi.spyOn(messagesDb, 'listMessagesBySession').mockResolvedValue([
      { id: '1', session_id: 's1', role: 'user', content: 'hello', tool_calls: null, tool_call_id: null, created_at: new Date().toISOString() },
      { id: '2', session_id: 's1', role: 'assistant', content: 'hi there', tool_calls: null, tool_call_id: null, created_at: new Date().toISOString() },
    ] as Awaited<ReturnType<typeof messagesDb.listMessagesBySession>>);

    await evolveFromChat(userId, 'openai', 'gpt-4o-mini', 's1');

    const profile = await getOrCreatePersonalityProfile(userId);
    expect(profile.vector.warmth).toBeGreaterThan(DEFAULT_PERSONALITY_VECTOR.warmth);
    expect(profile.emotionalState.mood).toBe('excited');
    expect(profile.traits).toContain('curious');

    vi.restoreAllMocks();
  });

  it('incubates personality from sample', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify({
        vector: { ...DEFAULT_PERSONALITY_VECTOR, warmth: 90 },
        emotionalState: { valence: 0.5, arousal: 0.4, mood: 'warm' },
        traits: ['friendly'],
        reasoning: 'test',
      }),
      finishReason: 'stop',
    });

    const profile = await incubateFromChatLogs(userId, 'openai', 'gpt-4o-mini', 'sample chat');
    expect(profile.vector.warmth).toBe(90);
    expect(profile.traits).toContain('friendly');
  });
});
