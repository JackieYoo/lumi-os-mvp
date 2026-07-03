import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  Edit2,
  Save,
  X,
  Brain,
  Calendar,
  Star,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { apiRequest } from '../lib/api.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { toast } from 'sonner';

interface Memory {
  id: string;
  content: string;
  importance: number;
  created_at: string;
  last_accessed_at: string;
}

export default function MemoryManagement() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState(5);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Memory[]>(
        'GET',
        `/memories?q=${encodeURIComponent(query)}&limit=100`
      );
      setMemories(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [query]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？')) return;
    try {
      await apiRequest('DELETE', `/memories/${id}`);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success('已删除');
    } catch {
      // handled
    }
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditImportance(memory.importance);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await apiRequest('PUT', `/memories/${id}`, {
        content: editContent,
        importance: editImportance,
      });
      setMemories((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, content: editContent, importance: editImportance }
            : m
        )
      );
      setEditingId(null);
      toast.success('已保存');
    } catch {
      // handled
    }
  };

  return (
    <AppLayout title="记忆管理" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索记忆..."
                className="pl-9"
              />
            </div>
            <Button variant="secondary" onClick={() => navigate('/chat')}>
              去聊天
            </Button>
          </CardContent>
        </Card>

        {loading && memories.length === 0 && (
          <div className="py-12 text-center text-text-tertiary">加载中…</div>
        )}

        {!loading && memories.length === 0 && (
          <Card>
            <CardContent className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/20">
                <Brain size={32} />
              </div>
              <p className="text-lg font-medium text-text-primary">还没有记忆</p>
              <p className="mt-1 text-sm text-text-tertiary">
                在聊天中开启「启用记忆」，AI 会自动记录重要事实。
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3 pb-4">
          {memories.map((memory) => (
            <Card key={memory.id}>
              <CardContent className="p-4">
                {editingId === memory.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[90px] w-full rounded-xl border border-celestial-border bg-celestial-deep/60 p-3 text-sm text-text-primary outline-none transition focus:border-lumi-accent/50 focus:ring-1 focus:ring-lumi-accent/30"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-text-secondary">重要度</label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={editImportance}
                        onChange={(e) => setEditImportance(Number(e.target.value))}
                        className="w-32 accent-lumi-accent"
                      />
                      <span className="text-sm font-medium text-lumi-accent">{editImportance}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X size={14} /> 取消
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(memory.id)}>
                        <Save size={14} /> 保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                      {memory.content}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star size={12} /> {memory.importance}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-text-tertiary">
                          <Calendar size={12} />
                          {new Date(memory.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(memory)}
                          className="h-8 w-8"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(memory.id)}
                          className="h-8 w-8 text-status-error hover:text-status-error"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
