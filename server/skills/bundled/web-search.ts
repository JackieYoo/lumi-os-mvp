import { registerTool } from '../registry.js';

registerTool({
  name: 'search_web',
  description: 'Search the web for a query. (Placeholder: returns a note that real search is not configured.)',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
    },
    required: ['query'],
  },
  execute(args) {
    return {
      note: 'Web search is not configured. Integrate a search provider (e.g. Serper, Bing, DuckDuckGo) to enable live results.',
      query: args.query,
      results: [],
    };
  },
});
