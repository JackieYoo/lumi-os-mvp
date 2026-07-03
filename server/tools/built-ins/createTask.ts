import { registerTool } from '../registry.js';
import { planTask } from '../../tasks/planner.js';
import { createTask, createTaskStep } from '../../tasks/db.js';

registerTool({
  name: 'create_task',
  description:
    'Create an autonomous task for the user. Use this when the user asks you to do something that requires multiple steps or should happen later. Parameters: { userId: string, goal: string }',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'The user ID' },
      goal: { type: 'string', description: 'The task goal in natural language' },
    },
    required: ['userId', 'goal'],
  },
  async execute(args: Record<string, unknown>) {
    const userId = args.userId;
    const goal = args.goal;

    if (typeof userId !== 'string' || typeof goal !== 'string') {
      return { success: false, error: 'Missing userId or goal' };
    }

    if (!goal.trim()) {
      return { success: false, error: 'Missing goal' };
    }

    const plan = await planTask(userId, goal);

    const task = await createTask({
      userId,
      title: plan.title,
      description: plan.description,
      triggerType: 'chat',
    });

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      await createTaskStep({
        taskId: task.id,
        stepIndex: i,
        description: step.description,
        toolName: step.toolName,
        toolArgs: step.toolArgs,
      });
    }

    return {
      success: true,
      taskId: task.id,
      title: task.title,
      stepCount: plan.steps.length,
    };
  },
});
