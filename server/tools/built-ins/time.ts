import { registerTool } from '../registry.js';

registerTool({
  name: 'get_current_time',
  description: 'Get the current date and time in ISO format and a human-readable string.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute() {
    const now = new Date();
    return {
      iso: now.toISOString(),
      human: now.toLocaleString('zh-CN', { dateStyle: 'full', timeStyle: 'medium' }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
});
