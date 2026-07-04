import crypto from 'crypto';
import { getDb } from './connection.js';

export interface UserToolPreferenceRecord {
  id: string;
  user_id: string;
  tool_name: string;
  enabled: number;
  source: string;
  updated_at: string;
}

export interface UserToolPreference {
  id: string;
  userId: string;
  toolName: string;
  enabled: boolean;
  source: 'builtin' | 'mcp';
  updatedAt: string;
}

export interface ToolPreferenceInput {
  toolName: string;
  enabled: boolean;
  source?: 'builtin' | 'mcp';
}

export type ToolPreferenceMap = Record<string, boolean>;

export async function getUserToolPreferences(userId: string): Promise<UserToolPreference[]> {
  const db = await getDb();
  const rows = await db.all<UserToolPreferenceRecord[]>(
    'SELECT * FROM user_tool_preferences WHERE user_id = ? ORDER BY updated_at DESC',
    userId,
  );
  return rows.map(toUserToolPreference);
}

export async function getUserToolPreferenceMap(userId: string): Promise<ToolPreferenceMap> {
  const prefs = await getUserToolPreferences(userId);
  const map: ToolPreferenceMap = {};
  for (const pref of prefs) {
    map[pref.toolName] = pref.enabled;
  }
  return map;
}

export async function setUserToolPreference(
  userId: string,
  toolName: string,
  enabled: boolean,
  source: 'builtin' | 'mcp' = 'builtin',
): Promise<UserToolPreference> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO user_tool_preferences (id, user_id, tool_name, enabled, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, tool_name) DO UPDATE SET
       enabled = excluded.enabled,
       source = excluded.source,
       updated_at = excluded.updated_at`,
    id,
    userId,
    toolName,
    enabled ? 1 : 0,
    source,
    now,
  );

  const row = await db.get<UserToolPreferenceRecord>(
    'SELECT * FROM user_tool_preferences WHERE user_id = ? AND tool_name = ?',
    userId,
    toolName,
  );
  if (!row) {
    throw new Error(`Failed to set tool preference for ${toolName}`);
  }
  return toUserToolPreference(row);
}

export async function bulkSetUserToolPreferences(
  userId: string,
  preferences: ToolPreferenceInput[],
): Promise<UserToolPreference[]> {
  const db = await getDb();
  await db.run('BEGIN');

  try {
    for (const pref of preferences) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO user_tool_preferences (id, user_id, tool_name, enabled, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, tool_name) DO UPDATE SET
           enabled = excluded.enabled,
           source = excluded.source,
           updated_at = excluded.updated_at`,
        id,
        userId,
        pref.toolName,
        pref.enabled ? 1 : 0,
        pref.source ?? 'builtin',
        now,
      );
    }

    const toolNames = preferences.map((p) => p.toolName);
    const placeholders = toolNames.map(() => '?').join(',');
    const rows = await db.all<UserToolPreferenceRecord[]>(
      `SELECT * FROM user_tool_preferences WHERE user_id = ? AND tool_name IN (${placeholders})`,
      userId,
      ...toolNames,
    );

    await db.run('COMMIT');
    return rows.map(toUserToolPreference);
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

export async function isToolEnabledForUser(userId: string, toolName: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get<{ enabled: number }>(
    'SELECT enabled FROM user_tool_preferences WHERE user_id = ? AND tool_name = ?',
    userId,
    toolName,
  );
  if (!row) return true;
  return !!row.enabled;
}

function toUserToolPreference(row: UserToolPreferenceRecord): UserToolPreference {
  return {
    id: row.id,
    userId: row.user_id,
    toolName: row.tool_name,
    enabled: !!row.enabled,
    source: row.source as 'builtin' | 'mcp',
    updatedAt: row.updated_at,
  };
}
