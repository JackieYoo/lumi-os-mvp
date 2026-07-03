import { registerTool } from '../registry.js';

registerTool({
  name: 'get_weather',
  description: 'Get a simple weather description for a city. (Placeholder: no live API configured.)',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name',
      },
    },
    required: ['city'],
  },
  execute(args) {
    const city = String(args.city);
    return {
      city,
      condition: 'unknown',
      temperature: null,
      note: 'Live weather API is not configured. Integrate a provider such as OpenWeatherMap to enable real forecasts.',
    };
  },
});
