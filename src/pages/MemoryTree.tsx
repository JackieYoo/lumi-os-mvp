import { useCallback, useEffect, useState, Suspense, lazy } from 'react';
import { Network, Sparkles } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PixelTree, type MemoryNode } from '../components/memory/PixelTree.js';
import { TreeSearch } from '../components/memory/TreeSearch.js';
import { TreeNodeDetail } from '../components/memory/TreeNodeDetail.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent } from '../components/ui/Card.js';
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
        <Button type="button" variant="secondary" size="sm" onClick={() => setUse3D(!use3D)} className="gap-1.5">
          <Network size={14} />
          {use3D ? '切换 2D' : '切换 3D'}
        </Button>
      }
    >
      <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-lumi-accent">
                <Sparkles size={18} />
                <span className="text-sm font-medium">记忆可视化</span>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">在树状网络中浏览长期记忆</h2>
              <p className="mt-1 text-sm text-text-tertiary">切换 2D / 3D 模式，搜索并探索 Lumi 记住的所有信息。</p>
            </div>
            <div className="w-full max-w-md">
              <TreeSearch value={searchQuery} onChange={setSearchQuery} />
            </div>
          </CardContent>
        </Card>

        <div className="relative flex-1 overflow-hidden rounded-2xl border border-celestial-border bg-celestial-panel/40">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-text-tertiary">加载记忆中...</div>
          ) : memories.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-text-tertiary">
              <Network size={48} className="text-lumi-accent/40" />
              <p className="text-base font-medium text-text-primary">暂无记忆</p>
              <p className="text-sm">先去对话中积累一些吧</p>
            </div>
          ) : use3D ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-text-tertiary">加载 3D 场景中...</div>
              }
            >
              <MemoryTree3D memories={memories} searchQuery={searchQuery} onNodeClick={handle3DNodeClick} />
            </Suspense>
          ) : (
            <PixelTree memories={memories} searchQuery={searchQuery} onNodeClick={handle2DNodeClick} />
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

          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-celestial-border bg-celestial-panel/70 px-3 py-1.5 text-xs text-text-tertiary backdrop-blur-md">
            {memories.length} 个记忆节点
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
