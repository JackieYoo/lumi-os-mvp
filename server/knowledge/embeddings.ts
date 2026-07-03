import { generateEmbedding, cosineSimilarity } from '../memory/embeddings.js';
import {
  listKnowledgeChunksByUser,
  createKnowledgeChunk,
} from '../db/knowledge-enhancement.js';

export { generateEmbedding };
export { cosineSimilarity };

export async function embedKnowledgeChunks(
  userId: string,
  fileId: string,
  chunks: { index: number; total: number; text: string }[],
): Promise<void> {
  const now = new Date().toISOString();

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    await createKnowledgeChunk({
      id: crypto.randomUUID(),
      user_id: userId,
      file_id: fileId,
      chunk_index: chunk.index,
      total_chunks: chunk.total,
      content: chunk.text,
      embedding_json: embedding ? JSON.stringify(embedding) : null,
      created_at: now,
    });
  }
}

export async function retrieveKnowledgeChunks(
  userId: string,
  query: string,
  limit = 5,
): Promise<Array<{ content: string; source?: string; score: number }>> {
  const queryEmbedding = await generateEmbedding(query);
  const chunks = await listKnowledgeChunksByUser(userId);

  const scored = chunks.map((chunk) => {
    let score = 0;
    if (queryEmbedding && chunk.embedding_json) {
      const embedding = JSON.parse(chunk.embedding_json) as number[];
      score = cosineSimilarity(queryEmbedding, embedding);
    }

    // Simple keyword boost
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = chunk.content.toLowerCase();
    const keywordHits = queryWords.filter((w) => contentLower.includes(w)).length;
    score += keywordHits * 0.05;

    return {
      content: chunk.content,
      source: `chunk ${chunk.chunk_index}/${chunk.total_chunks}`,
      score,
    };
  });

  return scored.filter((c) => c.score > 0.1).sort((a, b) => b.score - a.score).slice(0, limit);
}
