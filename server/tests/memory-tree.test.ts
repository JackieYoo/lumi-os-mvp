import { describe, it, expect } from 'vitest';
import { buildMemoryTree } from '../memory/tree.js';

describe('Memory Tree', () => {
  it('builds a tree grouped by month', () => {
    const memories = [
      {
        id: '1',
        content: 'Likes coffee',
        importance: 8,
        created_at: '2026-01-15T10:00:00Z',
        source: null,
      },
      {
        id: '2',
        content: 'Loves hiking',
        importance: 9,
        created_at: '2026-01-20T10:00:00Z',
        source: null,
      },
      {
        id: '3',
        content: 'Works remotely',
        importance: 5,
        created_at: '2026-02-10T10:00:00Z',
        source: null,
      },
    ];

    const tree = buildMemoryTree(memories);

    expect(tree.type).toBe('root');
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].children.length).toBe(2);
    expect(tree.children[1].children.length).toBe(1);
    expect(tree.children[0].children[0].type).toBe('leaf');
  });

  it('returns empty tree for no memories', () => {
    const tree = buildMemoryTree([]);
    expect(tree.children.length).toBe(0);
  });
});
