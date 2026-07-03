export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskTriggerType = 'manual' | 'scheduled' | 'chat' | 'event';

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  triggerType: TaskTriggerType;
  scheduleCron: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStepItem {
  id: string;
  stepIndex: number;
  description: string;
  toolName: string | null;
  toolArgs: Record<string, unknown> | undefined;
  status: TaskStepStatus;
  result: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TaskExecutionItem {
  id: string;
  status: string;
  resultSummary: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface TaskDetail extends TaskItem {
  steps: TaskStepItem[];
  latestExecution: TaskExecutionItem | null;
}
