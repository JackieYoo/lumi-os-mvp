import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Decorative orbs */}
      <div className="pointer-events-none fixed left-1/4 top-1/4 h-64 w-64 rounded-full bg-lumi-accent/10 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lumi-accent/40 via-lumi-accent/20 to-transparent text-lumi-accent shadow-[0_0_40px_rgba(56,189,248,0.25)] ring-1 ring-lumi-accent/30">
            <Sparkles size={32} className="relative z-10" />
            <div className="absolute inset-0 rounded-2xl bg-lumi-accent/10 blur-lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight-custom text-text-primary">LumiOS</h1>
          <p className="mt-1 text-text-secondary">你的个人 AI 伴侣</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass space-y-5 rounded-3xl p-8"
        >
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-text-primary">
              {isRegister ? '创建账户' : '欢迎回来'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {isRegister ? '开启你的 AI 伴侣之旅' : '登录以继续对话'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-celestial-border bg-celestial-deep/60 px-4 py-2.5 text-text-primary shadow-inner transition placeholder:text-text-tertiary hover:border-celestial-border-strong focus:border-lumi-accent/50 focus:outline-none focus:ring-1 focus:ring-lumi-accent/30"
              placeholder="输入用户名"
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-celestial-border bg-celestial-deep/60 px-4 py-2.5 text-text-primary shadow-inner transition placeholder:text-text-tertiary hover:border-celestial-border-strong focus:border-lumi-accent/50 focus:outline-none focus:ring-1 focus:ring-lumi-accent/30"
              placeholder="输入密码"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-lumi-accent to-lumi-accent-deep px-4 py-2.5 font-semibold text-celestial-deep shadow-[0_0_24px_rgba(14,165,233,0.35)] transition hover:shadow-[0_0_32px_rgba(14,165,233,0.5)] hover:brightness-110 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            {isSubmitting ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            {isRegister ? '已有账户？' : '还没有账户？'}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="ml-1 font-medium text-lumi-accent transition hover:text-lumi-accent-soft hover:underline"
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          个人本地 AI 操作系统 · 数据由你掌控
        </p>
      </div>
    </div>
  );
}
