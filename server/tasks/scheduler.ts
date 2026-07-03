import { logger } from '../lib/logger.js';
import { executeTask } from './engine.js';
import { listScheduledTasks } from './db.js';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function startScheduler(): void {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(() => {
    void checkScheduledTasks().catch((err) => {
      logger.error('Scheduled task check failed', { error: getErrorMessage(err) });
    });
  }, 60_000);

  logger.info('Task scheduler started');
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Task scheduler stopped');
  }
}

export async function checkScheduledTasks(now = new Date()): Promise<void> {
  const tasks = await listScheduledTasks();

  for (const task of tasks) {
    if (task.status === 'running') continue;
    if (!task.schedule_cron) continue;

    if (matchesCron(task.schedule_cron, now)) {
      logger.info('Executing scheduled task', { taskId: task.id, cron: task.schedule_cron });
      void executeTask(task.id).catch((err) => {
        logger.error('Scheduled task execution failed', { taskId: task.id, error: getErrorMessage(err) });
      });
    }
  }
}

export function matchesCron(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    logger.warn('Invalid cron expression', { cron });
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    fieldMatches(minute, date.getMinutes()) &&
    fieldMatches(hour, date.getHours()) &&
    fieldMatches(dayOfMonth, date.getDate()) &&
    fieldMatches(month, date.getMonth() + 1) &&
    fieldMatches(dayOfWeek, date.getDay())
  );
}

function fieldMatches(field: string, value: number): boolean {
  if (field === '*') return true;

  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (value >= start && value <= end) return true;
    } else if (Number(part) === value) {
      return true;
    }
  }

  return false;
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
