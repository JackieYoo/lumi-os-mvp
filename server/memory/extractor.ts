import { LLMMessage } from '../llm/types.js';
import { completeLLM, getProvider } from '../llm/router.js';
import { MemoryCandidate } from './types.js';

const EXTRACTION_PROMPT = `You are a memory extraction engine. Given a conversation, extract factual memories about the user that would be useful to remember for future conversations.

Rules:
- Extract only factual, enduring information (preferences, identities, relationships, goals, important facts).
- Do not extract transient or trivial details.
- Output a JSON array of objects with "content" (string) and "importance" (1-10).
- If nothing worth remembering, return an empty array.

Conversation:
{{conversation}}

Output JSON only:`;

export async function extractMemories(messages: LLMMessage[]): Promise<MemoryCandidate[]> {
  const conversation = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const provider = selectProvider();
  if (!provider) {
    return [];
  }

  try {
    const response = await completeLLM({
      provider,
      messages: [
        { role: 'system', content: 'You output valid JSON only.' },
        { role: 'user', content: EXTRACTION_PROMPT.replace('{{conversation}}', conversation) },
      ],
      temperature: 0.2,
    });

    return parseMemoryResponse(response.content);
  } catch (err) {
    return [];
  }
}

function selectProvider(): string | null {
  // Prefer cheap cloud providers; fallback to Ollama
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

function parseMemoryResponse(content: string): MemoryCandidate[] {
  try {
    const cleaned = content.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(cleaned) as MemoryCandidate[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => typeof m.content === 'string' && m.content.length > 0)
      .map((m) => ({
        content: m.content.slice(0, 500),
        importance: Math.max(1, Math.min(10, Number(m.importance) || 5)),
      }));
  } catch {
    return [];
  }
}
