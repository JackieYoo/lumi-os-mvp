import { getDb } from '../db/connection.js';
import {
  PersonalityProfile,
  DEFAULT_PERSONALITY_VECTOR,
  DEFAULT_EMOTIONAL_STATE,
  DEFAULT_COGNITIVE_PROFILE,
} from '../personality/types.js';

export async function getPersonalityProfile(userId: string): Promise<PersonalityProfile | undefined> {
  const db = await getDb();
  const row = await db.get<{
    user_id: string;
    vector_json: string;
    emotional_state_json: string;
    cognitive_json: string;
    traits_json: string;
    updated_at: string;
  }>('SELECT * FROM personality_profiles WHERE user_id = ?', userId);

  if (!row) return undefined;

  return {
    userId: row.user_id,
    vector: JSON.parse(row.vector_json) as PersonalityProfile['vector'],
    emotionalState: JSON.parse(row.emotional_state_json) as PersonalityProfile['emotionalState'],
    cognitive: JSON.parse(row.cognitive_json) as PersonalityProfile['cognitive'],
    traits: JSON.parse(row.traits_json) as string[],
    updatedAt: row.updated_at,
  };
}

export async function savePersonalityProfile(profile: PersonalityProfile): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO personality_profiles (user_id, vector_json, emotional_state_json, cognitive_json, traits_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       vector_json = excluded.vector_json,
       emotional_state_json = excluded.emotional_state_json,
       cognitive_json = excluded.cognitive_json,
       traits_json = excluded.traits_json,
       updated_at = excluded.updated_at`,
    profile.userId,
    JSON.stringify(profile.vector),
    JSON.stringify(profile.emotionalState),
    JSON.stringify(profile.cognitive),
    JSON.stringify(profile.traits),
    profile.updatedAt,
  );
}

export async function getOrCreatePersonalityProfile(userId: string): Promise<PersonalityProfile> {
  const existing = await getPersonalityProfile(userId);
  if (existing) return existing;

  const profile: PersonalityProfile = {
    userId,
    vector: { ...DEFAULT_PERSONALITY_VECTOR },
    emotionalState: { ...DEFAULT_EMOTIONAL_STATE },
    cognitive: { ...DEFAULT_COGNITIVE_PROFILE },
    traits: [],
    updatedAt: new Date().toISOString(),
  };

  await savePersonalityProfile(profile);
  return profile;
}
