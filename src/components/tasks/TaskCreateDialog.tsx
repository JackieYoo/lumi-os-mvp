import { useState } from 'react';
import { X, Sparkles, Clock } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { apiRequest } from '../../lib/api.js';

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function TaskCreateDialog({ open, onClose, onCreated }: TaskCreateDialogProps) {
  const [goal, setGoal] = useState('');
  const [scheduleCron, setScheduleCron] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    try {
      await apiRequest('POST', '/tasks', {
        goal: goal.trim(),
        triggerType: scheduleCron ? 'scheduled' : 'manual',
        scheduleCron: scheduleCron || undefined,
      });
      setGoal('');
      setScheduleCron('');
      onCreated();
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/50 bg-celestial-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">新建任务</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              目标
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例如：每天早上帮我查看邮件并总结重点"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-700/50 bg-celestial-deep px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-lumi-accent focus:outline-none"
            />
            <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
              <Sparkles size={12} />
              AI 会自动将目标拆解为可执行步骤
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              调度周期（可选）
            </label>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              <input
                type="text"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                placeholder="分 时 日 月 周，例如 0 9 * * *"
                className="flex-1 rounded-xl border border-slate-700/50 bg-celestial-deep px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-lumi-accent focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              留空表示手动执行；填写后系统会按 cron 规则自动触发
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={loading || !goal.trim()}>
              {loading ? '创建中…' : '创建任务'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
