import { Play, CheckCircle2, XCircle, Loader2, Clock, PauseCircle } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.js';
import type { TaskDetail, TaskStepStatus } from '../../types/tasks.js';

interface TaskDetailPanelProps {
  task: TaskDetail;
  onRun: () => void;
}

function stepStatusIcon(status: TaskStepStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    case 'failed':
      return <XCircle size={14} className="text-red-400" />;
    case 'running':
      return <Loader2 size={14} className="animate-spin text-lumi-accent" />;
    case 'skipped':
      return <PauseCircle size={14} className="text-text-tertiary" />;
    case 'pending':
    default:
      return <Clock size={14} className="text-text-tertiary" />;
  }
}

function stepStatusLabel(status: TaskStepStatus) {
  const labels: Record<TaskStepStatus, string> = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    skipped: '已跳过',
  };
  return labels[status];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function TaskDetailPanel({ task, onRun }: TaskDetailPanelProps) {
  const canRun = ['pending', 'paused', 'failed', 'completed', 'cancelled'].includes(task.status);

  return (
    <div className="space-y-4">
      <Card className="border-celestial-border">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{task.title}</CardTitle>
              {task.description && (
                <p className="mt-1 text-sm text-text-tertiary">{task.description}</p>
              )}
            </div>
            {canRun && (
              <Button variant="primary" size="sm" onClick={onRun}>
                <Play size={14} /> 立即执行
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-celestial-surface px-2.5 py-1 text-text-secondary">
              状态：{task.status}
            </span>
            <span className="rounded-full bg-celestial-surface px-2.5 py-1 text-text-secondary">
              触发：{task.triggerType}
            </span>
            {task.scheduleCron && (
              <span className="rounded-full bg-celestial-surface px-2.5 py-1 text-text-secondary">
                Cron：{task.scheduleCron}
              </span>
            )}
          </div>

          {task.latestExecution?.resultSummary && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {task.latestExecution.resultSummary}
            </div>
          )}
          {task.latestExecution?.errorMessage && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
              {task.latestExecution.errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-celestial-border">
        <CardHeader>
          <CardTitle>执行步骤</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-xl border border-celestial-border bg-celestial-deep/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-celestial-surface text-xs text-text-tertiary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{step.description}</p>
                    {step.toolName && (
                      <p className="text-xs text-text-tertiary">
                        工具：{step.toolName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {stepStatusIcon(step.status)}
                  <span className="text-text-tertiary">{stepStatusLabel(step.status)}</span>
                </div>
              </div>

              {step.error && (
                <div className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-200">
                  {step.error}
                </div>
              )}

              {step.result !== null && step.result !== undefined && (
                <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-celestial-surface/50 p-2.5">
                  <pre className="whitespace-pre-wrap text-xs text-text-secondary">
                    {formatValue(step.result)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
