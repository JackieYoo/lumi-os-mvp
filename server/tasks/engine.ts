import { completeLLM } from '../llm/router.js';
import { executeTool } from '../tools/registry.js';
import { executeMCPTool } from '../mcp/tools.js';
import {
  createTaskExecution,
  getTaskWithSteps,
  updateTaskExecution,
  updateTaskStatus,
  updateTaskStatusIfNotRunning,
  updateTaskStepStatus,
} from './db.js';
import { emitTaskStepUpdate, emitTaskUpdate } from '../socket/tasks.js';
import { createNotification } from '../db/notifications.js';
import { emitNotification } from '../socket/notifications.js';
import { logger } from '../lib/logger.js';
import { TaskStep, TaskWithLatestExecution } from './types.js';

export async function executeTask(taskId: string): Promise<void> {
  const task = await getTaskWithSteps(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Atomic conditional update prevents concurrent executions
  const started = await updateTaskStatusIfNotRunning(taskId, 'running');
  if (!started) {
    logger.warn('Task is already running', { taskId });
    return;
  }

  emitTaskUpdate(task.user_id, { taskId, status: 'running' });
  const execution = await createTaskExecution(taskId);

  try {
    const steps = task.steps.filter((s) => s.status === 'pending');
    for (const step of steps) {
      await runStep(task, step);
    }

    const summary = await summarizeExecution(task);
    await updateTaskExecution(execution.id, 'completed', summary);
    await updateTaskStatus(taskId, 'completed');
    emitTaskUpdate(task.user_id, { taskId, status: 'completed', summary });
    await notifyTaskCompleted(task, summary);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    logger.error('Task execution failed', { taskId, error: errorMessage });
    await updateTaskExecution(execution.id, 'failed', undefined, errorMessage);
    await updateTaskStatus(taskId, 'failed');
    emitTaskUpdate(task.user_id, { taskId, status: 'failed', error: errorMessage });
    await notifyTaskFailed(task, errorMessage);
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function notifyTaskCompleted(task: TaskWithLatestExecution, summary: string): Promise<void> {
  try {
    const notification = await createNotification({
      userId: task.user_id,
      type: 'task_completed',
      title: '任务完成',
      body: `${task.title}：${summary}`,
      data: { taskId: task.id },
    });
    emitNotification(task.user_id, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      read: !!notification.read,
      data: { taskId: task.id },
      createdAt: notification.created_at,
    });
  } catch (err) {
    logger.warn('Failed to create completion notification', { taskId: task.id, error: getErrorMessage(err) });
  }
}

async function notifyTaskFailed(task: TaskWithLatestExecution, errorMessage: string): Promise<void> {
  try {
    const notification = await createNotification({
      userId: task.user_id,
      type: 'task_failed',
      title: '任务失败',
      body: `${task.title}：${errorMessage}`,
      data: { taskId: task.id, error: errorMessage },
    });
    emitNotification(task.user_id, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      read: !!notification.read,
      data: { taskId: task.id, error: errorMessage },
      createdAt: notification.created_at,
    });
  } catch (err) {
    logger.warn('Failed to create failure notification', { taskId: task.id, error: getErrorMessage(err) });
  }
}

async function runStep(task: TaskWithLatestExecution, step: TaskStep): Promise<void> {
  await updateTaskStepStatus(step.id, 'running');
  emitTaskStepUpdate(task.user_id, { taskId: task.id, stepId: step.id, status: 'running' });

  try {
    let result: unknown;

    if (step.tool_name) {
      const toolArgs = step.tool_args_json ? JSON.parse(step.tool_args_json) : {};
      result = await executeToolWithFallback(step.tool_name, toolArgs);
    } else {
      result = await runReasoningStep(task, step);
    }

    await updateTaskStepStatus(step.id, 'completed', result ? { result } : null);
    emitTaskStepUpdate(task.user_id, {
      taskId: task.id,
      stepId: step.id,
      status: 'completed',
      result,
    });
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    await updateTaskStepStatus(step.id, 'failed', null, errorMessage);
    emitTaskStepUpdate(task.user_id, {
      taskId: task.id,
      stepId: step.id,
      status: 'failed',
      error: errorMessage,
    });
    throw err;
  }
}

async function executeToolWithFallback(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    return await executeTool(toolName, args);
  } catch (err) {
    if (getErrorMessage(err).includes('Tool not found')) {
      return await executeMCPTool(toolName, args);
    }
    throw err;
  }
}

async function runReasoningStep(task: TaskWithLatestExecution, step: TaskStep): Promise<string> {
  const response = await completeLLM({
    provider: 'openai',
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are executing a step in a larger task. Task: ${task.title}. Execute this step and return a concise result.`,
      },
      { role: 'user', content: step.description },
    ],
    temperature: 0.5,
  });
  return response.content || 'No result';
}

async function summarizeExecution(task: TaskWithLatestExecution): Promise<string> {
  try {
    const stepResults = task.steps
      .map((s) => {
        const result = s.result_json ? JSON.parse(s.result_json) : null;
        return `- ${s.description}: ${result ? JSON.stringify(result) : 'completed'}`;
      })
      .join('\n');

    const response = await completeLLM({
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following task execution results in one concise sentence.',
        },
        { role: 'user', content: `Task: ${task.title}\n\nSteps:\n${stepResults}` },
      ],
      temperature: 0.5,
    });
    return response.content || 'Task completed';
  } catch (err) {
    logger.warn('Failed to summarize execution', { taskId: task.id, error: getErrorMessage(err) });
    return 'Task completed';
  }
}

export async function cancelRunningTask(taskId: string): Promise<void> {
  const task = await getTaskWithSteps(taskId);
  if (!task) return;

  if (task.status !== 'running') return;

  await updateTaskStatus(taskId, 'cancelled');
  emitTaskUpdate(task.user_id, { taskId, status: 'cancelled' });
}
