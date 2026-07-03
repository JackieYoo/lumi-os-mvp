import { Play, Trash2, Clock, CheckCircle2, XCircle, PauseCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Card, CardContent } from '../ui/Card.js';
import type { TaskItem, TaskStatus } from '../../types/tasks.js';

interface TaskListProps {
  tasks: TaskItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}

function statusIcon(status: TaskStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'failed':
      return <XCircle size={16} className="text-red-400" />;
    case 'running':
      return <Loader2 size={16} className="animate-spin text-lumi-accent" />;
    case 'paused':
      return <PauseCircle size={16} className="text-amber-400" />;
    case 'cancelled':
      return <XCircle size={16} className="text-slate-400" />;
    case 'pending':
    default:
      return <Clock size={16} className="text-slate-400" />;
  }
}

function statusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    pending: '待执行',
    running: '执行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return labels[status];
}

export function TaskList({
  tasks,
  loading,
  selectedId,
  onSelect,
  onRun,
  onDelete,
}: TaskListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-700/50 p-4">
        <h2 className="text-sm font-medium text-slate-300">任务列表</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">加载中…</p>
        )}

        {!loading && tasks.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            暂无任务
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`cursor-pointer transition hover:bg-white/5 ${
                selectedId === task.id
                  ? 'border-lumi-accent/50 bg-lumi-accent/10'
                  : 'border-slate-700/50'
              }`}
              onClick={() => onSelect(task.id)}
            >
              <CardContent className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(task.status)}
                    <span className="truncate text-sm font-medium text-white">
                      {task.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{statusLabel(task.status)}</span>
                    {task.scheduleCron && <span>· 周期</span>}
                    <span>· {new Date(task.updatedAt).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {['pending', 'paused', 'failed', 'completed', 'cancelled'].includes(
                    task.status
                  ) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-lumi-accent hover:text-lumi-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRun(task.id);
                      }}
                    >
                      <Play size={14} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
