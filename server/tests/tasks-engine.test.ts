import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { executeTask } from '../tasks/engine.js';
import { createTask, createTaskStep, getTaskWithSteps, listTaskExecutions } from '../tasks/db.js';
import { createUser, deleteUser } from './helpers/auth.js';
import { closeDb } from '../db/connection.js';
import * as toolRegistry from '../tools/registry.js';
import * as mcpTools from '../mcp/tools.js';
import * as llmRouter from '../llm/router.js';
import * as taskSocket from '../socket/tasks.js';
import * as settingsDb from '../db/settings.js';
import * as toolPreferences from '../db/tool-preferences.js';

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

vi.mock('../db/settings.js', () => ({
  getOrCreateUserSettings: vi.fn(),
}));

vi.mock('../db/tool-preferences.js', () => ({
  isToolEnabledForUser: vi.fn().mockResolvedValue(true),
  getUserToolPreferenceMap: vi.fn().mockResolvedValue({}),
}));

describe('Task execution engine', () => {
  const userId = `task-engine-test-${Date.now()}`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsDb.getOrCreateUserSettings).mockResolvedValue({
      userId,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      enableMemory: true,
      enableTools: true,
      defaultVoice: null,
      defaultPersonaMode: null,
      notifications: {},
      updatedAt: new Date().toISOString(),
    });
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
    expect(llmRouter.completeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      })
    );
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

  it('skips step when tool is disabled by user preference', async () => {
    const prefMap = vi.mocked(toolPreferences.getUserToolPreferenceMap);
    prefMap.mockResolvedValue({ time: false });

    const task = await createTask({ userId, title: 'Disabled tool task' });
    await createTaskStep({
      taskId: task.id,
      stepIndex: 0,
      description: 'Get time',
      toolName: 'time',
    });

    vi.mocked(toolRegistry.executeTool).mockRejectedValue(new Error('should not be called'));

    await executeTask(task.id);

    const updated = await getTaskWithSteps(task.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.steps[0].status).toBe('skipped');
    expect(updated?.steps[0].error).toContain('disabled');
    expect(vi.mocked(toolRegistry.executeTool)).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await deleteUser(userId);
    await closeDb();
  });
});
