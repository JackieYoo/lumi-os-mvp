import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planTask } from '../tasks/planner.js';
import * as personalityEngine from '../personality/engine.js';
import * as memoryContext from '../memory/context.js';
import * as llmRouter from '../llm/router.js';

vi.mock('../llm/router.js', () => ({
  completeLLM: vi.fn(),
}));

vi.mock('../personality/engine.js', () => ({
  getOrCreatePersonalityProfile: vi.fn(),
  buildPersonalityContext: vi.fn(),
}));

vi.mock('../memory/context.js', () => ({
  buildMemoryContext: vi.fn(),
}));

describe('Task planner', () => {
  const userId = 'planner-test-user';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plans a task from a user goal', async () => {
    vi.mocked(personalityEngine.getOrCreatePersonalityProfile).mockResolvedValue({
      userId,
      vector: { warmth: 50, curiosity: 50, creativity: 50, rationality: 50, empathy: 50, assertiveness: 50, playfulness: 50, depth: 50 },
      emotionalState: { valence: 0, arousal: 0, mood: 'neutral' },
      cognitive: { thinkingVsFeeling: 0, intuitionVsSensing: 0 },
      traits: [],
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(personalityEngine.buildPersonalityContext).mockReturnValue('Personality context');
    vi.mocked(memoryContext.buildMemoryContext).mockResolvedValue({
      memories: [],
      summary: '',
    });

    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify({
        title: 'Research LumiOS',
        description: 'Search and summarize information about LumiOS',
        steps: [
          { description: 'Search the web for LumiOS', toolName: 'web_search', toolArgs: { query: 'LumiOS' } },
          { description: 'Summarize findings' },
        ],
      }),
      finishReason: 'stop',
    });

    const plan = await planTask(userId, 'Find information about LumiOS');

    expect(plan.title).toBe('Research LumiOS');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolName).toBe('web_search');
    expect(plan.steps[1].toolName).toBeUndefined();
    expect(completeLLM).toHaveBeenCalledTimes(1);
  });

  it('falls back to a single step when LLM returns invalid JSON', async () => {
    vi.mocked(personalityEngine.getOrCreatePersonalityProfile).mockResolvedValue({
      userId,
      vector: { warmth: 50, curiosity: 50, creativity: 50, rationality: 50, empathy: 50, assertiveness: 50, playfulness: 50, depth: 50 },
      emotionalState: { valence: 0, arousal: 0, mood: 'neutral' },
      cognitive: { thinkingVsFeeling: 0, intuitionVsSensing: 0 },
      traits: [],
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(personalityEngine.buildPersonalityContext).mockReturnValue('');
    vi.mocked(memoryContext.buildMemoryContext).mockResolvedValue({ memories: [], summary: '' });

    vi.mocked(llmRouter.completeLLM).mockResolvedValue({
      content: 'not valid json',
      finishReason: 'stop',
    });

    const plan = await planTask(userId, 'Do something');

    expect(plan.title).toBe('Do something');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].description).toBe('Do something');
  });

  it('uses memory context to shape the plan', async () => {
    vi.mocked(personalityEngine.getOrCreatePersonalityProfile).mockResolvedValue({
      userId,
      vector: { warmth: 50, curiosity: 50, creativity: 50, rationality: 50, empathy: 50, assertiveness: 50, playfulness: 50, depth: 50 },
      emotionalState: { valence: 0, arousal: 0, mood: 'neutral' },
      cognitive: { thinkingVsFeeling: 0, intuitionVsSensing: 0 },
      traits: [],
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(personalityEngine.buildPersonalityContext).mockReturnValue('');
    vi.mocked(memoryContext.buildMemoryContext).mockResolvedValue({
      memories: [{ id: '1', content: 'User prefers concise answers', importance: 8 }],
      summary: 'User prefers concise answers',
    });

    vi.mocked(llmRouter.completeLLM).mockResolvedValue({
      content: JSON.stringify({
        title: 'Concise task',
        description: 'A task',
        steps: [{ description: 'Execute' }],
      }),
      finishReason: 'stop',
    });

    await planTask(userId, 'Tell me something');

    const call = vi.mocked(llmRouter.completeLLM).mock.calls[0][0];
    expect(call.messages.some((m) => m.content.includes('concise'))).toBe(true);
  });
});
