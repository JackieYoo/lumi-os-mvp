import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { planTask } from '../tasks/planner.js';
import { executeTask, cancelRunningTask } from '../tasks/engine.js';
import {
  createTaskWithSteps,
  getTaskById,
  getTaskWithSteps,
  listTasksByUser,
  updateTaskStatus,
  updateTaskTitle,
  updateTaskSchedule,
  deleteTask,
  listTaskExecutions,
} from '../tasks/db.js';

const CRON_REGEX = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;

const createTaskSchema = z.object({
  goal: z.string().min(1).max(5000),
  title: z.string().min(1).max(200).optional(),
  triggerType: z.enum(['manual', 'scheduled', 'chat', 'event']).optional(),
  scheduleCron: z
    .string()
    .max(100)
    .regex(CRON_REGEX, 'Invalid cron expression')
    .optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduleCron: z
    .string()
    .max(100)
    .regex(CRON_REGEX, 'Invalid cron expression')
    .nullable()
    .optional(),
});

export const taskRouter = Router();
taskRouter.use(requireAuth);

function safeJsonParse(json: string | null): Record<string, unknown> | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

interface SerializedTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  triggerType: string;
  scheduleCron: string | null;
  context: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    stepIndex: number;
    description: string;
    toolName: string | null;
    toolArgs: Record<string, unknown> | undefined;
    status: string;
    result: Record<string, unknown> | undefined;
    error: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  latestExecution: {
    id: string;
    status: string;
    resultSummary: string | null;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
}

function serializeTask(task: Awaited<ReturnType<typeof getTaskWithSteps>>): SerializedTask | null {
  if (!task) return null;
  return {
    id: task.id,
    userId: task.user_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    triggerType: task.trigger_type,
    scheduleCron: task.schedule_cron,
    context: safeJsonParse(task.context_json),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    steps: task.steps.map((s) => ({
      id: s.id,
      stepIndex: s.step_index,
      description: s.description,
      toolName: s.tool_name,
      toolArgs: safeJsonParse(s.tool_args_json),
      status: s.status,
      result: safeJsonParse(s.result_json),
      error: s.error,
      startedAt: s.started_at,
      completedAt: s.completed_at,
    })),
    latestExecution: task.latestExecution
      ? {
          id: task.latestExecution.id,
          status: task.latestExecution.status,
          resultSummary: task.latestExecution.result_summary,
          errorMessage: task.latestExecution.error_message,
          startedAt: task.latestExecution.started_at,
          completedAt: task.latestExecution.completed_at,
        }
      : null,
  };
}

taskRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const parsedLimit = parseInt(String(req.query.limit), 10);
    const limit = Number.isNaN(parsedLimit) ? 100 : Math.min(parsedLimit, 200);
    const tasks = await listTasksByUser(req.user!.id, limit);
    res.json({
      success: true,
      data: tasks.map((t) => ({
        id: t.id,
        userId: t.user_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        triggerType: t.trigger_type,
        scheduleCron: t.schedule_cron,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const input = createTaskSchema.parse(req.body);
    const plan = await planTask(req.user!.id, input.goal);

    const fullTask = await createTaskWithSteps({
      task: {
        userId: req.user!.id,
        title: input.title || plan.title,
        description: plan.description,
        triggerType: input.triggerType || 'manual',
        scheduleCron: input.scheduleCron,
      },
      steps: plan.steps.map((step) => ({
        description: step.description,
        toolName: step.toolName,
        toolArgs: step.toolArgs,
      })),
    });

    res.status(201).json({ success: true, data: serializeTask(fullTask) });
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskWithSteps(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    res.json({ success: true, data: serializeTask(task) });
  } catch (err) {
    next(err);
  }
});

taskRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }

    const input = updateTaskSchema.parse(req.body);
    if (input.title) await updateTaskTitle(task.id, input.title);
    if (input.scheduleCron !== undefined) await updateTaskSchedule(task.id, input.scheduleCron);

    const updated = await getTaskWithSteps(task.id);
    res.json({ success: true, data: serializeTask(updated) });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/run', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    if (task.status === 'running') {
      throw new AppError(409, 'Task is already running', 'TASK_ALREADY_RUNNING');
    }

    void executeTask(task.id).catch(() => {
      // errors logged inside engine
    });

    res.status(202).json({ success: true, message: 'Task execution started' });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/pause', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    await updateTaskStatus(task.id, 'paused');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/resume', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    await updateTaskStatus(task.id, 'pending');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    await cancelRunningTask(task.id);
    await updateTaskStatus(task.id, 'cancelled');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

taskRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    await deleteTask(task.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/:id/executions', async (req: AuthRequest, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task || task.user_id !== req.user!.id) {
      throw new AppError(404, 'Task not found', 'TASK_NOT_FOUND');
    }
    const executions = await listTaskExecutions(task.id);
    res.json({
      success: true,
      data: executions.map((e) => ({
        id: e.id,
        status: e.status,
        resultSummary: e.result_summary,
        errorMessage: e.error_message,
        startedAt: e.started_at,
        completedAt: e.completed_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});
