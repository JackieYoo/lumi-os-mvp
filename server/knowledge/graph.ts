import { completeLLM, getProvider } from '../llm/router.js';
import { logger } from '../lib/logger.js';
import { upsertKnowledgeEntity } from '../db/knowledge-enhancement.js';

const ENTITY_PROMPT = `You are an entity extraction engine. Given a text, extract important named entities (people, organizations, locations, concepts, products).

Respond ONLY with a JSON array in this format:
[
  { "name": "Anthropic", "type": "organization" },
  { "name": "Claude", "type": "product" }
]

Do not output anything except valid JSON.

Text:`;

export async function extractEntities(
  userId: string,
  fileId: string,
  text: string,
): Promise<void> {
  const provider = selectProvider();
  if (!provider || !text.trim()) return;

  try {
    const response = await completeLLM({
      provider,
      messages: [
        { role: 'system', content: ENTITY_PROMPT },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      temperature: 0.2,
    });

    const entities = parseEntities(response.content);
    for (const entity of entities) {
      await upsertKnowledgeEntity({
        user_id: userId,
        file_id: fileId,
        name: entity.name,
        entity_type: entity.type || null,
      });
    }
  } catch (err) {
    logger.error('Entity extraction failed', { error: (err as Error).message });
  }
}

function selectProvider(): string | null {
  const candidates = ['deepseek', 'openai', 'ollama'];
  for (const name of candidates) {
    try {
      const p = getProvider(name);
      if (p.isAvailable()) return name;
    } catch {
      // ignore
    }
  }
  return null;
}

function parseEntities(content: string): Array<{ name: string; type?: string }> {
  try {
    const cleaned = content.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Array<{ name: string; type?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => typeof e.name === 'string' && e.name.length > 0);
  } catch {
    return [];
  }
}
