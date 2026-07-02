import { useCallback, useEffect, useState, Suspense, lazy } from 'react';
import { Network } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PixelTree, type MemoryNode } from '../components/memory/PixelTree.js';
import { TreeSearch } from '../components/memory/TreeSearch.js';
import { TreeNodeDetail } from '../components/memory/TreeNodeDetail.js';
import { Button } from '../components/ui/Button.js';
import { apiRequest } from '../lib/api.js';

const MemoryTree3D = lazy(() => import('../components/memory/MemoryTree3D.js'));
import type { TreeNode3D } from '../components/memory/MemoryTree3D.js';

interface Memory {
  id: string;
  content: string;
  importance: number;
  created_at: string;
  source: string | null;
}

type SelectedNode =
  | { mode: '2d'; node: MemoryNode }
  | { mode: '3d'; node: TreeNode3D }
  | null;

export default function MemoryTree() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [use3D, setUse3D] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<Memory[]>('GET', '/memories?limit=1000');
      setMemories(data);
    } catch {
      // handled by apiRequest
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handle2DNodeClick = (node: MemoryNode) => {
    setSelectedNode({ mode: '2d', node });
  };

  const handle3DNodeClick = (node: TreeNode3D) => {
    setSelectedNode({ mode: '3d', node });
  };

  const selectedData = selectedNode
    ? selectedNode.mode === '2d'
      ? selectedNode.node
      : {
          content: selectedNode.node.content,
          importance: selectedNode.node.importance,
          created_at: selectedNode.node.created_at,
          source: null as string | null,
        }
    : null;

  return (
    <AppLayout
      title="3D 记忆树"
      sidebarProps={{}}
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setUse3D(!use3D)}
          className="gap-1.5"
        >
          <Network size={14} />
          {use3D ? '切换 2D' : '切换 3D'}
        </Button>
      }
    >
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute left-1/2 top-4 z-10 w-full max-w-md -translate-x-1/2 px-4">
          <TreeSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            加载记忆中...
          </div>
        ) : memories.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <Network size={48} className="text-slate-600" />
            <p>暂无记忆，先去对话中积累一些吧</p>
          </div>
        ) : use3D ? (
          <Suspense fallback={
            <div className="flex h-full items-center justify-center text-slate-500">
              加载 3D 场景中...
            </div>
          }>
            <MemoryTree3D
              memories={memories}
              searchQuery={searchQuery}
              onNodeClick={handle3DNodeClick}
            />
          </Suspense>
        ) : (
          <PixelTree
            memories={memories}
            searchQuery={searchQuery}
            onNodeClick={handle2DNodeClick}
          />
        )}

        {selectedData && (
          <TreeNodeDetail
            content={selectedData.content}
            importance={selectedData.importance}
            created_at={selectedData.created_at}
            source={selectedData.source}
            onClose={() => setSelectedNode(null)}
          />
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 text-xs text-slate-600"
        >
          {memories.length} 个记忆节点
        </div>
      </div>
    </AppLayout>
  );
}
