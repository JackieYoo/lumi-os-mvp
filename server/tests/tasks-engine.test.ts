import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { executeTask } from '../tasks/engine.js';
import { createTask, createTaskStep, getTaskWithSteps, listTaskExecutions } from '../tasks/db.js';
import { createUser, deleteUser } from './helpers/auth.js';
import { closeDb } from '../db/connection.js';
import * as toolRegistry from '../tools/registry.js';
import * as mcpTools from '../mcp/tools.js';
import * as llmRouter from '../llm/router.js';
import * as taskSocket from '../socket/tasks.js';

vi.mock('../tools/registry.js', () => ({
  executeTool: vi.fn(),
}));

vi.mock('../mcp/tools.js', () => ({
  executeMCPTool: vi.fn(),
}));

vi.mock('../llm/router.js', () => ({
  completeLLM: vi.fn(),
}));

vi.mock('../socket/tasks.js', () => ({
  emitTaskUpdate: vi.fn(),
  emitTaskStepUpdate: vi.fn(),
}));

describe('Task execution engine', () => {
  const userId = `task-engine-test-${Date.now()}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    await createUser(userId, 'task-engine-test-user', 'password123');
  });

  it('executes all steps and marks task completed', async () => {
    const task = await createTask({ userId, title: 'Engine test' });
    await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Get time',
      toolName: 'time',
    });
    await createTaskStep({
      taskId: task.id,
      stepIndex: 1,
      description: 'Summarize',
    });

    vi.mocked(toolRegistry.executeTool).mockResolvedValue({ time: '2024-01-01T00:00:00Z' });
    vi.mocked(llmRouter.completeLLM).mockResolvedValue({
      content: 'Summary done',
      finishReason: 'stop',
    });

    await executeTask(task.id);

    const updated = await getTaskWithSteps(task.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.steps[0].status).toBe('completed');
    expect(updated?.steps[1].status).toBe('completed');

    const executions = await listTaskExecutions(task.id);
    expect(executions[0].status).toBe('completed');
    expect(executions[0].result_summary).toBe('Summary done');
  });

  it('falls back to MCP tool when built-in tool is not found', async () => {
    const task = await createTask({ userId, title: 'MCP fallback' });
    await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Use MCP tool',
      toolName: 'server__tool',
    });

    vi.mocked(toolRegistry.executeTool).mockRejectedValue(new Error('Tool not found: server__tool'));
    vi.mocked(mcpTools.executeMCPTool).mockResolvedValue({ ok: true });

    await executeTask(task.id);

    const updated = await getTaskWithSteps(task.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.steps[0].status).toBe('completed');
    expect(mcpTools.executeMCPTool).toHaveBeenCalledWith('server__tool', expect.any(Object));
  });

  it('marks task failed when a step fails', async () => {
    const task = await createTask({ userId, title: 'Failing task' });
    await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Fail',
      toolName: 'time',
    });

    vi.mocked(toolRegistry.executeTool).mockRejectedValue(new Error('Network error'));

    await executeTask(task.id);

    const updated = await getTaskWithSteps(task.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.steps[0].status).toBe('failed');
    expect(updated?.steps[0].error).toContain('Network error');

    const executions = await listTaskExecutions(task.id);
    expect(executions[0].status).toBe('failed');
  });

  afterAll(async () => {
    await deleteUser(userId);
    await closeDb();
  });
});
