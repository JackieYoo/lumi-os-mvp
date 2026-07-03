import { registerTool } from '../registry.js';

registerTool({
  name: 'calculator',
  description: 'Evaluate a basic arithmetic expression safely. Supports +, -, *, /, parentheses and decimals.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Arithmetic expression, e.g. "(12 + 34) * 2"',
      },
    },
    required: ['expression'],
  },
  execute(args) {
    const expression = String(args.expression);
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (!sanitized) {
      throw new Error('Invalid expression');
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)();
    return { expression, result: Number(result) };
  },
});
