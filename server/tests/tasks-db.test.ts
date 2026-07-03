import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { closeDb } from '../db/connection.js';
import {
  createTask,
  createTaskStep,
  getTaskById,
  getTaskWithSteps,
  listTasksByUser,
  updateTaskStatus,
  updateTaskStepStatus,
  createTaskExecution,
  updateTaskExecution,
  listTaskExecutions,
  deleteTask,
} from '../tasks/db.js';
import { createUser, deleteUser } from './helpers/auth.js';

describe('Task DB layer', () => {
  const userId = `task-db-test-${Date.now()}`;

  beforeAll(async () => {
    await createUser(userId, 'task-db-test-user', 'password123');
  });

  it('creates and retrieves a task', async () => {
    const task = await createTask({
      userId,
      title: 'Test task',
      description: 'A test task',
      triggerType: 'manual',
    });

    expect(task.title).toBe('Test task');
    expect(task.status).toBe('pending');
    expect(task.trigger_type).toBe('manual');

    const found = await getTaskById(task.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Test task');
  });

  it('creates steps and retrieves task with steps', async () => {
    const task = await createTask({ userId, title: 'Task with steps' });

    const step1 = await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Search the web',
      toolName: 'web_search',
      toolArgs: { query: 'hello' },
    });
    const step2 = await createTaskStep({
      taskId: task.id,
      stepIndex: 1,
      description: 'Summarize',
    });

    expect(step1.task_id).toBe(task.id);
    expect(step1.tool_name).toBe('web_search');
    expect(step2.tool_name).toBeNull();

    const full = await getTaskWithSteps(task.id);
    expect(full).toBeDefined();
    expect(full?.steps).toHaveLength(2);
    expect(full?.steps[0].description).toBe('Search the web');
    expect(full?.latestExecution).toBeNull();
  });

  it('updates task status', async () => {
    const task = await createTask({ userId, title: 'Status task' });
    await updateTaskStatus(task.id, 'running');

    const found = await getTaskById(task.id);
    expect(found?.status).toBe('running');
  });

  it('updates step status with result and error', async () => {
    const task = await createTask({ userId, title: 'Step status task' });
    const step = await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Run tool',
      toolName: 'time',
    });

    await updateTaskStepStatus(step.id, 'running');
    await updateTaskStepStatus(step.id, 'completed', { value: 'ok' });

    const full = await getTaskWithSteps(task.id);
    const updated = full?.steps[0];
    expect(updated?.status).toBe('completed');
    expect(JSON.parse(updated?.result_json ?? '{}')).toEqual({ value: 'ok' });
  });

  it('creates and updates task executions', async () => {
    const task = await createTask({ userId, title: 'Execution task' });
    const execution = await createTaskExecution(task.id);

    expect(execution.status).toBe('running');

    await updateTaskExecution(execution.id, 'completed', 'Done');

    const executions = await listTaskExecutions(task.id);
    expect(executions).toHaveLength(1);
    expect(executions[0].status).toBe('completed');
    expect(executions[0].result_summary).toBe('Done');
  });

  it('lists tasks by user', async () => {
    const before = await listTasksByUser(userId);
    const task = await createTask({ userId, title: 'List task' });
    const after = await listTasksByUser(userId);

    expect(after.length).toBe(before.length + 1);
    expect(after.some((t) => t.id === task.id)).toBe(true);
  });

  it('deletes a task and its steps', async () => {
    const task = await createTask({ userId, title: 'Delete task' });
    await createTaskStep({ taskId: task.id, stepIndex: 0, description: 'Step' });

    await deleteTask(task.id);

    const found = await getTaskWithSteps(task.id);
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    await deleteUser(userId);
    await closeDb();
  });
});
