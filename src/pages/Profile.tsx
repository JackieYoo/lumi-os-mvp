import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Download,
  LogOut,
  Cpu,
  Save,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { toast } from 'sonner';

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
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem('lumi_settings');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    return {
      provider: 'openai',
      model: '',
      enableMemory: true,
      enableTools: true,
    };
  });

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
    localStorage.setItem('lumi_settings', JSON.stringify(settings));
  }, [settings]);

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

  const models = providerModels[settings.provider] || [];

  return (
    <AppLayout title="个人中心" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
        <Card className="border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={18} /> 账号信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">用户名</span>
              <span className="font-medium text-white">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">用户 ID</span>
              <span className="font-mono text-xs text-slate-300">{user?.id}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu size={18} /> 模型设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="LLM 提供商"
              value={settings.provider}
              onChange={(e) =>
                setSettings((prev: typeof settings) => ({
                  ...prev,
                  provider: e.target.value,
                  model: providerModels[e.target.value]?.[0] || '',
                }))
              }
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.available ? '' : '(未配置)'}
                </option>
              ))}
            </Select>

            {settings.provider === 'relay' ? (
              <div className="space-y-1">
                <label className="text-sm text-slate-300">模型（自定义）</label>
                <Input
                  value={settings.model}
                  onChange={(e) =>
                    setSettings((prev: typeof settings) => ({ ...prev, model: e.target.value }))
                  }
                  placeholder="例如：gpt-4o-mini"
                />
              </div>
            ) : (
              <Select
                label="模型"
                value={settings.model}
                onChange={(e) =>
                  setSettings((prev: typeof settings) => ({ ...prev, model: e.target.value }))
                }
              >
                {models.map((m: string) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            )}

            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-celestial-deep p-3">
                <span className="text-sm text-slate-200">启用记忆</span>
                <input
                  type="checkbox"
                  checked={settings.enableMemory}
                  onChange={(e) =>
                    setSettings((prev: typeof settings) => ({ ...prev, enableMemory: e.target.checked }))
                  }
                  className="h-4 w-4 accent-lumi-accent"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-celestial-deep p-3">
                <span className="text-sm text-slate-200">启用工具调用</span>
                <input
                  type="checkbox"
                  checked={settings.enableTools}
                  onChange={(e) =>
                    setSettings((prev: typeof settings) => ({ ...prev, enableTools: e.target.checked }))
                  }
                  className="h-4 w-4 accent-lumi-accent"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={18} /> 修改密码
            </CardTitle>
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
              <div className="flex items-center gap-1 text-sm text-red-400">
                <AlertCircle size={14} /> 两次输入的密码不一致
              </div>
            )}
            <Button onClick={handleChangePassword} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}>
              <Save size={16} /> 修改密码
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={18} /> 数据导出
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-400">
              导出你的记忆、会话和消息为 JSON 文件。
            </p>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} /> 导出数据
            </Button>
          </CardContent>
        </Card>

        <Button variant="danger" onClick={logout} className="w-full">
          <LogOut size={16} /> 退出登录
        </Button>
      </div>
    </AppLayout>
  );
}
