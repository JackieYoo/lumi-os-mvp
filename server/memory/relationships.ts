import { completeLLM, getProvider } from '../llm/router.js';
import { getDb } from '../db/connection.js';
import { logger } from '../lib/logger.js';

export interface Relationship {
  id: string;
  user_id: string;
  name: string;
  relation_type: string | null;
  summary: string | null;
  memory_ids: string | null;
  created_at: string;
  updated_at: string;
}

const RELATIONSHIP_PROMPT = `You are a relationship extraction engine. Given a conversation, extract notable people, organizations, or entities and their relationship to the user.

Respond ONLY with a JSON array in this format:
[
  {
    "name": "Alice",
    "relationType": "friend",
    "summary": "Alice is the user's college roommate who works in design."
  }
]

If no relationships are mentioned, return []. Do not output anything except valid JSON.

Conversation:`;

export async function extractRelationships(
  userId: string,
  transcript: string,
): Promise<Relationship[]> {
  const provider = selectProvider();
  if (!provider || !transcript.trim()) return [];

  try {
    const response = await completeLLM({
      provider,
      messages: [
        { role: 'system', content: RELATIONSHIP_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.3,
    });

    const parsed = parseRelationships(response.content);
    const now = new Date().toISOString();
    const db = await getDb();
    const saved: Relationship[] = [];

    for (const item of parsed) {
      const id = crypto.randomUUID();
      await db.run(
        `INSERT INTO relationships (id, user_id, name, relation_type, summary, memory_ids, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           relation_type = excluded.relation_type,
           summary = excluded.summary,
           updated_at = excluded.updated_at`,
        id,
        userId,
        item.name,
        item.relationType || null,
        item.summary || null,
        null,
        now,
        now,
      );
      saved.push({
        id,
        user_id: userId,
        name: item.name,
        relation_type: item.relationType || null,
        summary: item.summary || null,
        memory_ids: null,
        created_at: now,
        updated_at: now,
      });
    }

    return saved;
  } catch (err) {
    logger.error('Relationship extraction failed', { error: (err as Error).message });
    return [];
  }
}

export async function listRelationships(userId: string): Promise<Relationship[]> {
  const db = await getDb();
  return db.all<Relationship[]>(
    'SELECT * FROM relationships WHERE user_id = ? ORDER BY updated_at DESC',
    userId,
  );
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

function parseRelationships(content: string): Array<{
  name: string;
  relationType?: string;
  summary?: string;
}> {
  try {
    const cleaned = content.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Array<{
      name: string;
      relationType?: string;
      summary?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => typeof r.name === 'string' && r.name.length > 0);
  } catch {
    return [];
  }
}
