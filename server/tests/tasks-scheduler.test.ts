import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchesCron, checkScheduledTasks } from '../tasks/scheduler.js';
import * as engine from '../tasks/engine.js';
import * as db from '../tasks/db.js';
import { Task } from '../tasks/types.js';

vi.mock('../tasks/engine.js', () => ({
  executeTask: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../tasks/db.js', () => ({
  listScheduledTasks: vi.fn(),
  updateTaskStatus: vi.fn(),
}));

describe('Task scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches exact minute cron', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(matchesCron('30 10 * * *', date)).toBe(true);
    expect(matchesCron('31 10 * * *', date)).toBe(false);
  });

  it('matches wildcard cron', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(matchesCron('* 10 * * *', date)).toBe(true);
    expect(matchesCron('* 11 * * *', date)).toBe(false);
  });

  it('matches comma and range cron', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(matchesCron('30 9-11 * * *', date)).toBe(true);
    expect(matchesCron('0,30 10 * * *', date)).toBe(true);
    expect(matchesCron('0,15 10 * * *', date)).toBe(false);
  });

  it('checks scheduled tasks and executes due ones', async () => {
    const now = new Date('2024-01-15T10:30:00');
    const tasks: Task[] = [
      {
        id: 'due-task',
        user_id: 'u1',
        title: 'Due',
        description: null,
        status: 'pending',
        priority: 5,
        trigger_type: 'scheduled',
        schedule_cron: '30 10 * * *',
        context_json: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        id: 'not-due-task',
        user_id: 'u1',
        title: 'Not due',
        description: null,
        status: 'pending',
        priority: 5,
        trigger_type: 'scheduled',
        schedule_cron: '0 11 * * *',
        context_json: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ];

    vi.mocked(db.listScheduledTasks).mockResolvedValue(tasks);

    await checkScheduledTasks(now);

    expect(engine.executeTask).toHaveBeenCalledTimes(1);
    expect(engine.executeTask).toHaveBeenCalledWith('due-task');
  });

  it('skips running tasks', async () => {
    const now = new Date('2024-01-15T10:30:00');
    const tasks: Task[] = [
      {
        id: 'running-task',
        user_id: 'u1',
        title: 'Running',
        description: null,
        status: 'running',
        priority: 5,
        trigger_type: 'scheduled',
        schedule_cron: '30 10 * * *',
        context_json: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ];

    vi.mocked(db.listScheduledTasks).mockResolvedValue(tasks);

    await checkScheduledTasks(now);

    expect(engine.executeTask).not.toHaveBeenCalled();
  });
});
