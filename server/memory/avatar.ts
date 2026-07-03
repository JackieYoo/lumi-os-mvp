import { completeLLM, getProvider } from '../llm/router.js';
import { listMemoriesByUser } from '../db/memories.js';
import { logger } from '../lib/logger.js';

export interface MemoryAvatar {
  summary: string;
  values: string[];
  voiceNotes: string;
}

export async function generateMemoryAvatar(
  userId: string,
  providerName?: string,
): Promise<MemoryAvatar | null> {
  const provider = providerName || selectProvider();
  if (!provider) return null;

  const memories = await listMemoriesByUser(userId, 30);
  if (memories.length === 0) return null;

  const sample = memories.map((m) => `- ${m.content}`).join('\n');

  const prompt = `You are distilling a user's memories into a concise persona avatar for an AI companion.

Given these memories:
${sample}

Respond ONLY with JSON:
{
  "summary": "2-3 sentence persona summary",
  "values": ["value1", "value2", "value3"],
  "voiceNotes": "1 sentence note on how the AI should speak to this user"
}

Do not output anything except valid JSON.`;

  try {
    const response = await completeLLM({
      provider,
      messages: [
        { role: 'system', content: prompt },
      ],
      temperature: 0.5,
    });

    return parseAvatar(response.content);
  } catch (err) {
    logger.error('Memory avatar generation failed', { error: (err as Error).message });
    return null;
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

function parseAvatar(content: string): MemoryAvatar | null {
  try {
    const cleaned = content.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<MemoryAvatar>;
    return {
      summary: parsed.summary || 'A thoughtful companion.',
      values: Array.isArray(parsed.values) ? parsed.values : [],
      voiceNotes: parsed.voiceNotes || 'Speak warmly and clearly.',
    };
  } catch {
    return null;
  }
}
