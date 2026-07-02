export interface TreeNode {
  id: string;
  type: 'root' | 'branch' | 'leaf';
  label: string;
  content?: string;
  importance: number;
  created_at: string;
  hue: number;
  children: TreeNode[];
}

function formatMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function importanceToHue(importance: number): number {
  if (importance <= 3) return 0; // red
  if (importance <= 6) return 35; // amber
  if (importance <= 8) return 140; // green
  return 210; // blue
}

export function buildMemoryTree(
  memories: {
    id: string;
    content: string;
    importance: number;
    created_at: string;
    source: string | null;
  }[]
): TreeNode {
  const root: TreeNode = {
    id: 'root',
    type: 'root',
    label: '记忆之根',
    importance: 5,
    created_at: new Date().toISOString(),
    hue: 200,
    children: [],
  };

  // Group by month
  const groups = new Map<string, typeof memories>();
  for (const memory of memories) {
    const month = formatMonthLabel(memory.created_at);
    if (!groups.has(month)) {
      groups.set(month, []);
    }
    groups.get(month)!.push(memory);
  }

  for (const [month, monthMemories] of groups) {
    const branch: TreeNode = {
      id: `branch-${month}`,
      type: 'branch',
      label: month,
      importance: 5,
      created_at: monthMemories[0].created_at,
      hue: 200,
      children: [],
    };

    for (const memory of monthMemories) {
      branch.children.push({
        id: memory.id,
        type: 'leaf',
        label: memory.content.slice(0, 40) + (memory.content.length > 40 ? '...' : ''),
        content: memory.content,
        importance: memory.importance,
        created_at: memory.created_at,
        hue: importanceToHue(memory.importance),
        children: [],
      });
    }

    root.children.push(branch);
  }

  return root;
}
