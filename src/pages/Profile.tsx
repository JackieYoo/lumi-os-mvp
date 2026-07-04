import { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Download,
  LogOut,
  Cpu,
  Save,
  AlertCircle,
  Brain,
  Wrench,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.js';
import { toast } from 'sonner';
import {
  DEFAULT_USER_SETTINGS,
  getLegacySettings,
  mergeUserSettings,
  saveLegacySettings,
  type UserSettings,
} from '../types/settings.js';

interface ProviderInfo {
  name: string;
  defaultModel: string;
  available: boolean;
}

const providerModels: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  doubao: ['doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  glm: ['glm-4-flash', 'glm-4', 'glm-4v'],
  xiaomi: ['milm'],
  ollama: ['llama3.1', 'qwen2.5', 'mistral'],
  lmstudio: ['local-model'],
  relay: [],
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const settingsRef = useRef(settings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    apiRequest<ProviderInfo[]>('GET', '/chat/providers')
      .then(setProviders)
      .catch(() => {
        // handled
      });
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const remoteSettings = await apiRequest<UserSettings>('GET', '/settings');
        const legacySettings = getLegacySettings();
        const isRemoteDefault =
          remoteSettings.provider === DEFAULT_USER_SETTINGS.provider &&
          remoteSettings.model === DEFAULT_USER_SETTINGS.model &&
          remoteSettings.enableMemory === DEFAULT_USER_SETTINGS.enableMemory &&
          remoteSettings.enableTools === DEFAULT_USER_SETTINGS.enableTools &&
          remoteSettings.defaultVoice === DEFAULT_USER_SETTINGS.defaultVoice &&
          remoteSettings.defaultPersonaMode === DEFAULT_USER_SETTINGS.defaultPersonaMode &&
          Object.keys(remoteSettings.notifications).length === 0;

        if (legacySettings && isRemoteDefault) {
          const migrated = mergeUserSettings(remoteSettings, legacySettings);
          const saved = await apiRequest<UserSettings>('PUT', '/settings', migrated);
          setSettings(saved);
          saveLegacySettings(saved);
          return;
        }

        setSettings(remoteSettings);
        saveLegacySettings(remoteSettings);
      } catch {
        const legacySettings = getLegacySettings();
        if (legacySettings) {
          setSettings(mergeUserSettings(DEFAULT_USER_SETTINGS, legacySettings));
        }
      } finally {
        setSettingsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    try {
      await apiRequest('POST', '/auth/password', {
        currentPassword,
        newPassword,
      });
      toast.success('密码已修改');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // handled
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiRequest<unknown>('POST', '/auth/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumi-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('数据已导出');
    } catch {
      // handled
    }
  };

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const previous = settingsRef.current;
    const next = mergeUserSettings(previous, partial);
    setSettings(next);
    settingsRef.current = next;
    saveLegacySettings(next);

    try {
      const saved = await apiRequest<UserSettings>('PUT', '/settings', partial);
      setSettings(saved);
      settingsRef.current = saved;
      saveLegacySettings(saved);
    } catch {
      setSettings(previous);
      settingsRef.current = previous;
      toast.error('保存失败，已恢复');
    }
  };

  const models = providerModels[settings.provider] || [];

  return (
    <AppLayout title="个人中心" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        {settingsLoading && (
          <div className="py-12 text-center text-sm text-text-tertiary">加载设置中…</div>
        )}

        {!settingsLoading && (
          <>
            {/* Hero card */}
            <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-lumi-accent/15 to-transparent" />
          <CardContent className="relative flex items-center gap-4 p-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lumi-accent/30 to-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/30">
              <User size={28} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-text-primary">{user?.username}</h2>
              <p className="mt-0.5 font-mono text-xs text-text-tertiary">ID: {user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={18} className="text-lumi-accent" /> 模型设置
              </CardTitle>
              <CardDescription>配置默认对话模型与能力开关</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="LLM 提供商"
                value={settings.provider}
                onChange={(e) =>
                  void updateSettings({
                    provider: e.target.value,
                    model: providerModels[e.target.value]?.[0] || null,
                  })
                }
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.available ? '' : '(未配置)'}
                  </option>
                ))}
              </Select>

              {settings.provider === 'relay' ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">模型（自定义）</label>
                  <Input
                    value={settings.model ?? ''}
                    onChange={(e) =>
                      void updateSettings({ model: e.target.value || null })
                    }
                    placeholder="例如：gpt-4o-mini"
                  />
                </div>
              ) : (
                <Select
                  label="模型"
                  value={settings.model ?? ''}
                  onChange={(e) =>
                    void updateSettings({ model: e.target.value || null })
                  }
                >
                  {models.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </Select>
              )}

              <div className="space-y-2 pt-1">
                <ToggleRow
                  icon={<Brain size={16} />}
                  label="启用记忆"
                  description="对话时检索并保存记忆"
                  checked={settings.enableMemory}
                  onChange={(checked) =>
                    void updateSettings({ enableMemory: checked })
                  }
                />
                <ToggleRow
                  icon={<Wrench size={16} />}
                  label="启用工具调用"
                  description="允许 Lumi 调用内置与 MCP 工具"
                  checked={settings.enableTools}
                  onChange={(checked) =>
                    void updateSettings({ enableTools: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={18} className="text-lumi-accent" /> 修改密码
              </CardTitle>
              <CardDescription>更新你的登录密码</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                placeholder="当前密码"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="确认新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-1.5 text-sm text-status-error">
                  <AlertCircle size={14} /> 两次输入的密码不一致
                </div>
              )}
              <Button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full"
              >
                <Save size={16} /> 修改密码
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={18} className="text-lumi-accent" /> 数据导出
            </CardTitle>
            <CardDescription>将你的记忆、会话和消息导出为 JSON 文件</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">
              导出文件包含你的所有个人数据，可用于备份或迁移。
            </p>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} /> 导出数据
            </Button>
          </CardContent>
        </Card>

            <Button variant="danger" onClick={logout} className="w-full">
              <LogOut size={16} /> 退出登录
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-celestial-border bg-celestial-deep/40 p-3 transition hover:border-celestial-border-strong hover:bg-celestial-deep/60">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-celestial-surface text-text-secondary">{icon}</span>
        <div>
          <div className="text-sm font-medium text-text-primary">{label}</div>
          <div className="text-xs text-text-tertiary">{description}</div>
        </div>
      </div>
      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-celestial-surface transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-text-tertiary transition-all peer-checked:left-6 peer-checked:bg-lumi-accent" />
      </div>
    </label>
  );
}
