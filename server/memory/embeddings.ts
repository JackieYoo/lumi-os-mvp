import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!config.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      dangerouslyAllowBrowser: false,
    });
  }
  return client;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const openai = getClient();
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return response.data[0]?.embedding || null;
  } catch (err) {
    logger.error('Embedding generation failed', { error: (err as Error).message });
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
