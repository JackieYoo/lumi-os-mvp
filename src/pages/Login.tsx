import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lumi-accent/20 text-lumi-accent">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">LumiOS MVP</h1>
          <p className="text-sm text-slate-400">你的个人 AI 伴侣</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700/50 bg-celestial-panel/80 p-6 shadow-2xl backdrop-blur"
      >
        <h2 className="text-lg font-semibold text-white">
          {isRegister ? '创建账户' : '欢迎回来'}
        </h2>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-celestial-deep px-3 py-2 text-white outline-none focus:border-lumi-accent"
            required
            minLength={2}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-celestial-deep px-3 py-2 text-white outline-none focus:border-lumi-accent"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-lumi-accent px-4 py-2 font-medium text-celestial-deep transition hover:bg-sky-300 disabled:opacity-50"
        >
          {isSubmitting ? '处理中...' : isRegister ? '注册' : '登录'}
        </button>

        <p className="text-center text-sm text-slate-400">
          {isRegister ? '已有账户？' : '还没有账户？'}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="ml-1 text-lumi-accent hover:underline"
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </form>
    </div>
  );
}
