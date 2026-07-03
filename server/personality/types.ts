export interface PersonalityVector {
  warmth: number;
  curiosity: number;
  creativity: number;
  rationality: number;
  empathy: number;
  assertiveness: number;
  playfulness: number;
  depth: number;
}

export interface EmotionalState {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  mood: string;
}

export interface CognitiveProfile {
  thinkingVsFeeling: number; // -1 thinking, +1 feeling
  intuitionVsSensing: number; // -1 intuition, +1 sensing
}

export interface PersonalityProfile {
  userId: string;
  vector: PersonalityVector;
  emotionalState: EmotionalState;
  cognitive: CognitiveProfile;
  traits: string[];
  updatedAt: string;
}

export const DEFAULT_PERSONALITY_VECTOR: PersonalityVector = {
  warmth: 70,
  curiosity: 75,
  creativity: 60,
  rationality: 70,
  empathy: 75,
  assertiveness: 45,
  playfulness: 55,
  depth: 60,
};

export const DEFAULT_EMOTIONAL_STATE: EmotionalState = {
  valence: 0.3,
  arousal: 0.4,
  mood: 'calm',
};

export const DEFAULT_COGNITIVE_PROFILE: CognitiveProfile = {
  thinkingVsFeeling: 0.2,
  intuitionVsSensing: -0.3,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function vectorKeys(): (keyof PersonalityVector)[] {
  return Object.keys(DEFAULT_PERSONALITY_VECTOR) as (keyof PersonalityVector)[];
}
