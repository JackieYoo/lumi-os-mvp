import { describe, it, expect, vi } from 'vitest';
import { executeTool, getTool } from '../tools/registry.js';
import * as planner from '../tasks/planner.js';
import * as taskDb from '../tasks/db.js';

vi.mock('../tasks/planner.js', () => ({
  planTask: vi.fn(),
}));

vi.mock('../tasks/db.js', () => ({
  createTask: vi.fn(),
  createTaskStep: vi.fn(),
}));

describe('create_task built-in tool', () => {
  it('is registered after import', async () => {
    await import('../tools/built-ins/createTask.js');
    const tool = getTool('create_task');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('create_task');
  });

  it('creates a task from goal and steps', async () => {
    await import('../tools/built-ins/createTask.js');

    vi.mocked(planner.planTask).mockResolvedValue({
      title: 'Research topic',
      description: 'Search and summarize',
      steps: [
        { description: 'Search web', toolName: 'web_search' },
        { description: 'Summarize' },
      ],
    });

    vi.mocked(taskDb.createTask).mockResolvedValue({
      id: 'task-1',
      user_id: 'u1',
      title: 'Research topic',
      description: 'Search and summarize',
      status: 'pending',
      priority: 5,
      trigger_type: 'chat',
      schedule_cron: null,
      context_json: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await executeTool('create_task', {
      userId: 'u1',
      goal: 'Research topic',
    });

    expect(taskDb.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        title: 'Research topic',
        triggerType: 'chat',
      }),
    );
    expect(taskDb.createTaskStep).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: true,
      taskId: 'task-1',
      title: 'Research topic',
    });
  });

  it('returns error when goal is missing', async () => {
    await import('../tools/built-ins/createTask.js');
    const result = await executeTool('create_task', { userId: 'u1' });
    expect(result).toMatchObject({
      success: false,
      error: 'Missing userId or goal',
    });
  });
});
