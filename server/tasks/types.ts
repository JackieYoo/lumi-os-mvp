export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskTriggerType = 'manual' | 'scheduled' | 'chat' | 'event';
export type TaskStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  trigger_type: TaskTriggerType;
  schedule_cron: string | null;
  context_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStep {
  id: string;
  task_id: string;
  step_index: number;
  description: string;
  tool_name: string | null;
  tool_args_json: string | null;
  status: TaskStepStatus;
  result_json: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  status: TaskExecutionStatus;
  result_summary: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  triggerType?: TaskTriggerType;
  scheduleCron?: string;
  context?: Record<string, unknown>;
}

export interface CreateTaskStepInput {
  taskId: string;
  stepIndex: number;
  description: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface TaskWithSteps extends Task {
  steps: TaskStep[];
}

export interface TaskWithLatestExecution extends TaskWithSteps {
  latestExecution: TaskExecution | null;
}
