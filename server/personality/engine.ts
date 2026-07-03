import { listMessagesBySession } from '../db/messages.js';
import {
  getOrCreatePersonalityProfile,
  savePersonalityProfile,
} from '../db/personality.js';
import { completeLLM } from '../llm/router.js';
import { logger } from '../lib/logger.js';
import {
  PersonalityProfile,
  PersonalityVector,
  EmotionalState,
  DEFAULT_PERSONALITY_VECTOR,
  vectorKeys,
  clamp,
} from './types.js';

export { getOrCreatePersonalityProfile } from '../db/personality.js';

const EXTRACTION_PROMPT = `You are a personality analyst for an AI companion.
Given the following conversation between a user and the AI, analyze how the user's personality and emotional state should influence the AI's persona.

Respond ONLY with a JSON object in this exact format:
{
  "vectorDelta": {
    "warmth": number (-10 to 10),
    "curiosity": number (-10 to 10),
    "creativity": number (-10 to 10),
    "rationality": number (-10 to 10),
    "empathy": number (-10 to 10),
    "assertiveness": number (-10 to 10),
    "playfulness": number (-10 to 10),
    "depth": number (-10 to 10)
  },
  "emotionalState": {
    "valence": number (-1 to 1),
    "arousal": number (0 to 1),
    "mood": "one word like calm, excited, sad, anxious"
  },
  "newTraits": ["trait1", "trait2"],
  "reasoning": "brief explanation"
}

Rules:
- Each dimension is 0-100. Deltas adjust the current dimension.
- Positive delta = increase, negative = decrease.
- Do not output anything except valid JSON.

Conversation:`;

export function buildPersonalityContext(profile: PersonalityProfile): string {
  const dims = vectorKeys()
    .map((k) => `${k}: ${profile.vector[k]}`)
    .join(', ');

  return `Personality Profile (evolving):
- Dimensions: ${dims}
- Emotional state: ${profile.emotionalState.mood} (valence ${profile.emotionalState.valence.toFixed(
    2,
  )}, arousal ${profile.emotionalState.arousal.toFixed(2)})
- Notable traits: ${profile.traits.join(', ') || 'none yet'}

Adapt your tone subtly to these traits without breaking character. Be warm, curious, and concise.`;
}

export async function evolveFromChat(
  userId: string,
  provider: string,
  model: string | undefined,
  sessionId: string,
): Promise<void> {
  const profile = await getOrCreatePersonalityProfile(userId);
  const messages = await listMessagesBySession(sessionId);

  if (messages.length < 2) {
    return;
  }

  const transcript = messages
    .slice(-20)
    .map((m) => `${m.role}: ${m.content || ''}`)
    .join('\n');

  try {
    const response = await completeLLM({
      provider,
      model,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.5,
    });

    const parsed = parseExtractionResponse(response.content);
    if (!parsed) return;

    const nextVector = applyDelta(profile.vector, parsed.vectorDelta);
    const nextTraits = mergeTraits(profile.traits, parsed.newTraits);

    const nextProfile: PersonalityProfile = {
      ...profile,
      vector: nextVector,
      emotionalState: parsed.emotionalState,
      traits: nextTraits,
      updatedAt: new Date().toISOString(),
    };

    await savePersonalityProfile(nextProfile);
    logger.info('Personality evolved', { userId, mood: parsed.emotionalState.mood });
  } catch (err) {
    logger.error('Personality evolution failed', { userId, error: (err as Error).message });
  }
}

export async function incubateFromChatLogs(
  userId: string,
  provider: string,
  model: string | undefined,
  sample: string,
): Promise<PersonalityProfile> {
  const INCUBATION_PROMPT = `You are a personality analyst for an AI companion.
Given a sample of the user's past conversations, infer an initial personality profile for how the AI should relate to them.

Respond ONLY with a JSON object:
{
  "vector": {
    "warmth": number (0-100),
    "curiosity": number (0-100),
    "creativity": number (0-100),
    "rationality": number (0-100),
    "empathy": number (0-100),
    "assertiveness": number (0-100),
    "playfulness": number (0-100),
    "depth": number (0-100)
  },
  "emotionalState": {
    "valence": number (-1 to 1),
    "arousal": number (0 to 1),
    "mood": "one word"
  },
  "traits": ["trait1", "trait2"],
  "reasoning": "brief"
}

Do not output anything except valid JSON.

Conversation sample:`;

  const response = await completeLLM({
    provider,
    model,
    messages: [
      { role: 'system', content: INCUBATION_PROMPT },
      { role: 'user', content: sample || 'No prior conversation available.' },
    ],
    temperature: 0.5,
  });

  const parsed = parseIncubationResponse(response.content);
  const profile: PersonalityProfile = {
    userId,
    vector: parsed?.vector || { ...DEFAULT_PERSONALITY_VECTOR },
    emotionalState: parsed?.emotionalState || { valence: 0, arousal: 0.4, mood: 'neutral' },
    cognitive: { thinkingVsFeeling: 0, intuitionVsSensing: 0 },
    traits: parsed?.traits || [],
    updatedAt: new Date().toISOString(),
  };

  await savePersonalityProfile(profile);
  return profile;
}

function applyDelta(
  vector: PersonalityVector,
  delta: Partial<PersonalityVector>,
): PersonalityVector {
  const result = { ...vector };
  for (const key of vectorKeys()) {
    const change = delta[key] ?? 0;
    result[key] = clamp(Math.round(result[key] + change), 0, 100);
  }
  return result;
}

function mergeTraits(existing: string[], incoming: string[]): string[] {
  const set = new Set([...existing, ...incoming]);
  return Array.from(set).slice(0, 20);
}

function parseExtractionResponse(content: string): {
  vectorDelta: Partial<PersonalityVector>;
  emotionalState: EmotionalState;
  newTraits: string[];
} | null {
  try {
    const parsed = JSON.parse(content) as {
      vectorDelta?: Partial<PersonalityVector>;
      emotionalState?: EmotionalState;
      newTraits?: string[];
    };

    return {
      vectorDelta: parsed.vectorDelta || {},
      emotionalState: parsed.emotionalState || { valence: 0, arousal: 0.4, mood: 'neutral' },
      newTraits: parsed.newTraits || [],
    };
  } catch {
    return null;
  }
}

function parseIncubationResponse(content: string): {
  vector: PersonalityVector;
  emotionalState: EmotionalState;
  traits: string[];
} | null {
  try {
    const parsed = JSON.parse(content) as {
      vector?: PersonalityVector;
      emotionalState?: EmotionalState;
      traits?: string[];
    };

    if (!parsed.vector) return null;

    return {
      vector: parsed.vector,
      emotionalState: parsed.emotionalState || { valence: 0, arousal: 0.4, mood: 'neutral' },
      traits: parsed.traits || [],
    };
  } catch {
    return null;
  }
}
