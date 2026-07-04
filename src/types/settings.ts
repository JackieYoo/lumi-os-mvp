export interface UserSettings {
  provider: string;
  model: string | null;
  enableMemory: boolean;
  enableTools: boolean;
  defaultVoice: string | null;
  defaultPersonaMode: string | null;
  notifications: Record<string, unknown>;
  updatedAt?: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  provider: 'openai',
  model: null,
  enableMemory: true,
  enableTools: true,
  defaultVoice: null,
  defaultPersonaMode: null,
  notifications: {},
};

const LEGACY_SETTINGS_KEY = 'lumi_settings';

export function getLegacySettings(): Partial<UserSettings> | null {
  const raw = localStorage.getItem(LEGACY_SETTINGS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<UserSettings>;
  } catch {
    return null;
  }
}

export function saveLegacySettings(settings: Partial<UserSettings>): void {
  localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearLegacySettings(): void {
  localStorage.removeItem(LEGACY_SETTINGS_KEY);
}

export function mergeUserSettings(
  base: UserSettings,
  override?: Partial<UserSettings> | null,
): UserSettings {
  if (!override) return base;

  return {
    ...base,
    ...override,
    notifications: override.notifications ?? base.notifications,
  };
}
