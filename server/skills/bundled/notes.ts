import { registerTool } from '../registry.js';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const notes: Note[] = [];

registerTool({
  name: 'notes',
  description: 'Create, list or search quick notes. Supports create and list actions.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'search'],
        description: 'Action to perform',
      },
      title: {
        type: 'string',
        description: 'Note title (for create)',
      },
      content: {
        type: 'string',
        description: 'Note content (for create)',
      },
      query: {
        type: 'string',
        description: 'Search query (for search)',
      },
    },
    required: ['action'],
  },
  execute(args) {
    const action = String(args.action);

    if (action === 'create') {
      const title = String(args.title || 'Untitled');
      const content = String(args.content || '');
      const note: Note = {
        id: `${Date.now()}`,
        title,
        content,
        createdAt: new Date().toISOString(),
      };
      notes.push(note);
      return { note };
    }

    if (action === 'search') {
      const query = String(args.query || '').toLowerCase();
      const results = notes.filter(
        (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query),
      );
      return { results };
    }

    return { notes: [...notes] };
  },
});
