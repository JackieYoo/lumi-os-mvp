import { getDb } from '../db/connection.js';
import {
  Task,
  TaskStep,
  TaskExecution,
  CreateTaskInput,
  CreateTaskStepInput,
  TaskStatus,
  TaskStepStatus,
  TaskExecutionStatus,
  TaskWithLatestExecution,
} from './types.js';

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO tasks (id, user_id, title, description, status, priority, trigger_type, schedule_cron, context_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.userId,
    input.title,
    input.description ?? null,
    'pending',
    5,
    input.triggerType ?? 'manual',
    input.scheduleCron ?? null,
    input.context ? JSON.stringify(input.context) : null,
    now,
    now,
  );

  return {
    id,
    user_id: input.userId,
    title: input.title,
    description: input.description ?? null,
    status: 'pending',
    priority: 5,
    trigger_type: input.triggerType ?? 'manual',
    schedule_cron: input.scheduleCron ?? null,
    context_json: input.context ? JSON.stringify(input.context) : null,
    created_at: now,
    updated_at: now,
  };
}

export async function createTaskStep(input: CreateTaskStepInput): Promise<TaskStep> {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.run(
    `INSERT INTO task_steps (id, task_id, step_index, description, tool_name, tool_args_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.taskId,
    input.stepIndex,
    input.description,
    input.toolName ?? null,
    input.toolArgs ? JSON.stringify(input.toolArgs) : null,
    'pending',
  );

  return {
    id,
    task_id: input.taskId,
    step_index: input.stepIndex,
    description: input.description,
    tool_name: input.toolName ?? null,
    tool_args_json: input.toolArgs ? JSON.stringify(input.toolArgs) : null,
    status: 'pending',
    result_json: null,
    error: null,
    started_at: null,
    completed_at: null,
  };
}

export interface TaskWithStepsInput {
  task: CreateTaskInput;
  steps: Array<Pick<CreateTaskStepInput, 'description' | 'toolName' | 'toolArgs'>>;
}

export async function createTaskWithSteps(input: TaskWithStepsInput): Promise<TaskWithLatestExecution> {
  const db = await getDb();
  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run('BEGIN');

  try {
    await db.run(
      `INSERT INTO tasks (id, user_id, title, description, status, priority, trigger_type, schedule_cron, context_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      taskId,
      input.task.userId,
      input.task.title,
      input.task.description ?? null,
      'pending',
      5,
      input.task.triggerType ?? 'manual',
      input.task.scheduleCron ?? null,
      input.task.context ? JSON.stringify(input.task.context) : null,
      now,
      now,
    );

    for (let i = 0; i < input.steps.length; i++) {
      const step = input.steps[i];
      const stepId = crypto.randomUUID();
      await db.run(
        `INSERT INTO task_steps (id, task_id, step_index, description, tool_name, tool_args_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        stepId,
        taskId,
        i,
        step.description,
        step.toolName ?? null,
        step.toolArgs ? JSON.stringify(step.toolArgs) : null,
        'pending',
      );
    }

    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }

  const task = await getTaskWithSteps(taskId);
  if (!task) {
    throw new Error('Failed to create task');
  }
  return task;
}

export async function getTaskById(taskId: string): Promise<Task | undefined> {
  const db = await getDb();
  return db.get<Task>('SELECT * FROM tasks WHERE id = ?', taskId);
}

export async function getTaskWithSteps(taskId: string): Promise<TaskWithLatestExecution | undefined> {
  const db = await getDb();
  const task = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', taskId);
  if (!task) return undefined;

  const steps = await db.all<TaskStep[]>(
    'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_index ASC',
    taskId,
  );

  const latestExecution = await db.get<TaskExecution>(
    'SELECT * FROM task_executions WHERE task_id = ? ORDER BY started_at DESC LIMIT 1',
    taskId,
  );

  return {
    ...task,
    steps,
    latestExecution: latestExecution ?? null,
  };
}

export async function listTasksByUser(userId: string, limit = 100): Promise<Task[]> {
  const db = await getDb();
  return db.all<Task[]>(
    'SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
    userId,
    limit,
  );
}

export async function updateTaskStatusIfNotRunning(taskId: string, status: TaskStatus): Promise<boolean> {
  const db = await getDb();
  const result = await db.run(
    'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND status != ?',
    status,
    new Date().toISOString(),
    taskId,
    'running',
  );
  return (result.changes ?? 0) > 0;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', status, new Date().toISOString(), taskId);
}

export async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?', title, new Date().toISOString(), taskId);
}

export async function updateTaskSchedule(taskId: string, scheduleCron: string | null): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE tasks SET schedule_cron = ?, updated_at = ? WHERE id = ?',
    scheduleCron,
    new Date().toISOString(),
    taskId,
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM tasks WHERE id = ?', taskId);
}

export async function updateTaskStepStatus(
  stepId: string,
  status: TaskStepStatus,
  result?: Record<string, unknown> | null,
  error?: string | null,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.get<TaskStep>('SELECT * FROM task_steps WHERE id = ?', stepId);
  if (!existing) return;

  const startedAt = existing.started_at ?? (status === 'running' ? now : null);
  const completedAt = ['completed', 'failed', 'skipped'].includes(status) ? now : existing.completed_at;

  await db.run(
    `UPDATE task_steps
     SET status = ?, result_json = ?, error = ?, started_at = ?, completed_at = ?
     WHERE id = ?`,
    status,
    result ? JSON.stringify(result) : existing.result_json,
    error ?? existing.error,
    startedAt,
    completedAt,
    stepId,
  );
}

export async function listTaskSteps(taskId: string): Promise<TaskStep[]> {
  const db = await getDb();
  return db.all<TaskStep[]>(
    'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_index ASC',
    taskId,
  );
}

export async function createTaskExecution(taskId: string): Promise<TaskExecution> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO task_executions (id, task_id, status, started_at)
     VALUES (?, ?, ?, ?)`,
    id,
    taskId,
    'running',
    now,
  );

  return {
    id,
    task_id: taskId,
    status: 'running',
    result_summary: null,
    error_message: null,
    started_at: now,
    completed_at: null,
  };
}

export async function updateTaskExecution(
  executionId: string,
  status: TaskExecutionStatus,
  resultSummary?: string | null,
  errorMessage?: string | null,
): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE task_executions
     SET status = ?, result_summary = ?, error_message = ?, completed_at = ?
     WHERE id = ?`,
    status,
    resultSummary ?? null,
    errorMessage ?? null,
    new Date().toISOString(),
    executionId,
  );
}

export async function listTaskExecutions(taskId: string, limit = 20): Promise<TaskExecution[]> {
  const db = await getDb();
  return db.all<TaskExecution[]>(
    'SELECT * FROM task_executions WHERE task_id = ? ORDER BY started_at DESC LIMIT ?',
    taskId,
    limit,
  );
}

export async function listScheduledTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.all<Task[]>(
    "SELECT * FROM tasks WHERE trigger_type = 'scheduled' AND status != 'running'",
  );
}

export async function resetRunningTasks(): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE tasks SET status = 'pending' WHERE status = 'running'");
  await db.run(
    "UPDATE task_executions SET status = 'failed', completed_at = ? WHERE status = 'running'",
    new Date().toISOString(),
  );
}
