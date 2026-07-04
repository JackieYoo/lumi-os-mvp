import { getDb } from './connection.js';

export interface UserSettingsRecord {
  user_id: string;
  provider: string;
  model: string | null;
  enable_memory: number;
  enable_tools: number;
  default_voice: string | null;
  default_persona_mode: string | null;
  notifications_json: string | null;
  updated_at: string;
}

export interface UserSettings {
  userId: string;
  provider: string;
  model: string | null;
  enableMemory: boolean;
  enableTools: boolean;
  defaultVoice: string | null;
  defaultPersonaMode: string | null;
  notifications: Record<string, unknown>;
  updatedAt: string;
}

export interface UserSettingsUpdateInput {
  provider?: string;
  model?: string | null;
  enableMemory?: boolean;
  enableTools?: boolean;
  defaultVoice?: string | null;
  defaultPersonaMode?: string | null;
  notifications?: Record<string, unknown>;
}

const DEFAULT_SETTINGS = {
  provider: 'openai',
  model: null,
  enableMemory: true,
  enableTools: true,
  defaultVoice: null,
  defaultPersonaMode: null,
  notifications: {},
} as const;

export async function getUserSettings(userId: string): Promise<UserSettings | undefined> {
  const db = await getDb();
  const row = await db.get<UserSettingsRecord>('SELECT * FROM user_settings WHERE user_id = ?', userId);
  if (!row) return undefined;
  return toUserSettings(row);
}

export async function getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  const existing = await getUserSettings(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const db = await getDb();
  await db.run(
    `INSERT INTO user_settings (
      user_id,
      provider,
      model,
      enable_memory,
      enable_tools,
      default_voice,
      default_persona_mode,
      notifications_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    DEFAULT_SETTINGS.provider,
    DEFAULT_SETTINGS.model,
    1,
    1,
    DEFAULT_SETTINGS.defaultVoice,
    DEFAULT_SETTINGS.defaultPersonaMode,
    JSON.stringify(DEFAULT_SETTINGS.notifications),
    now,
  );

  return {
    userId,
    ...DEFAULT_SETTINGS,
    updatedAt: now,
  };
}

export async function saveUserSettings(
  userId: string,
  input: UserSettingsUpdateInput,
): Promise<UserSettings> {
  const current = await getOrCreateUserSettings(userId);
  const next: UserSettings = {
    userId,
    provider: input.provider ?? current.provider,
    model: input.model === undefined ? current.model : input.model,
    enableMemory: input.enableMemory ?? current.enableMemory,
    enableTools: input.enableTools ?? current.enableTools,
    defaultVoice: input.defaultVoice === undefined ? current.defaultVoice : input.defaultVoice,
    defaultPersonaMode:
      input.defaultPersonaMode === undefined ? current.defaultPersonaMode : input.defaultPersonaMode,
    notifications: input.notifications ?? current.notifications,
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  await db.run(
    `UPDATE user_settings
     SET provider = ?, model = ?, enable_memory = ?, enable_tools = ?, default_voice = ?, default_persona_mode = ?, notifications_json = ?, updated_at = ?
     WHERE user_id = ?`,
    next.provider,
    next.model,
    next.enableMemory ? 1 : 0,
    next.enableTools ? 1 : 0,
    next.defaultVoice,
    next.defaultPersonaMode,
    JSON.stringify(next.notifications),
    next.updatedAt,
    userId,
  );

  return next;
}

function toUserSettings(row: UserSettingsRecord): UserSettings {
  return {
    userId: row.user_id,
    provider: row.provider,
    model: row.model,
    enableMemory: !!row.enable_memory,
    enableTools: !!row.enable_tools,
    defaultVoice: row.default_voice,
    defaultPersonaMode: row.default_persona_mode,
    notifications: row.notifications_json
      ? (JSON.parse(row.notifications_json) as Record<string, unknown>)
      : {},
    updatedAt: row.updated_at,
  };
}
