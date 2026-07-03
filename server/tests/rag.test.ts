import { describe, it, expect } from 'vitest';
import { retrieveKnowledgeChunks } from '../knowledge/embeddings.js';
import { extractEntities } from '../knowledge/graph.js';
import * as llmRouter from '../llm/router.js';
import * as knowledgeEnhancementDb from '../db/knowledge-enhancement.js';
import { vi } from 'vitest';

vi.mock('../llm/router.js', () => ({
  completeLLM: vi.fn(),
  getProvider: vi.fn().mockReturnValue({ isAvailable: () => true }),
}));

describe('RAG and Knowledge Graph', () => {
  const userId = 'rag-test-user';
  const fileId = 'rag-test-file';

  it('retrieves knowledge chunks with keyword fallback', async () => {
    const createChunk = vi.spyOn(knowledgeEnhancementDb, 'createKnowledgeChunk');
    createChunk.mockResolvedValue();

    const chunks = await retrieveKnowledgeChunks(userId, 'hello world');
    expect(Array.isArray(chunks)).toBe(true);

    createChunk.mockRestore();
  });

  it('extracts entities and upserts them', async () => {
    const completeLLM = vi.mocked(llmRouter.completeLLM);
    completeLLM.mockResolvedValue({
      content: JSON.stringify([
        { name: 'OpenAI', type: 'organization' },
        { name: 'Claude', type: 'product' },
      ]),
      finishReason: 'stop',
    });

    const upsert = vi.spyOn(knowledgeEnhancementDb, 'upsertKnowledgeEntity');
    upsert.mockResolvedValue();

    await extractEntities(userId, fileId, 'OpenAI created Claude.');
    expect(upsert).toHaveBeenCalledTimes(2);

    upsert.mockRestore();
  });
});
