import { useEffect, useState } from 'react';
import { Sparkles, Users, Wand2, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { RelationshipGraph } from '../components/memory/RelationshipGraph.js';
import { apiRequest } from '../lib/api.js';
import { toast } from 'sonner';

interface Relationship {
  id: string;
  name: string;
  relation_type: string | null;
  summary: string | null;
}

interface MemoryAvatarData {
  summary: string;
  values: string[];
  voiceNotes: string;
}

export default function MemoryAvatar() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [avatar, setAvatar] = useState<MemoryAvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [consolidating, setConsolidating] = useState(false);

  const load = async () => {
    try {
      const [rels, av] = await Promise.all([
        apiRequest<Relationship[]>('GET', '/memory-enhancement/relationships'),
        apiRequest<MemoryAvatarData | null>('GET', '/memory-enhancement/avatar'),
      ]);
      setRelationships(rels);
      setAvatar(av);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerateAvatar = async () => {
    setGenerating(true);
    try {
      const data = await apiRequest<MemoryAvatarData>('GET', '/memory-enhancement/avatar?provider=openai');
      setAvatar(data);
      toast.success('记忆化身已生成');
    } catch {
      // handled
    } finally {
      setGenerating(false);
    }
  };

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      const result = await apiRequest<{ merged: number; decayed: number }>('POST', '/memory-enhancement/consolidate');
      toast.success(`合并 ${result.merged} 条，衰减 ${result.decayed} 条`);
    } catch {
      // handled
    } finally {
      setConsolidating(false);
    }
  };

  return (
    <AppLayout title="记忆化身" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-4">
        {loading && (
          <p className="text-center text-sm text-slate-500">加载中…</p>
        )}

        {!loading && (
          <>
            <Card className="border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users size={18} className="text-lumi-accent" />
                  关系网络
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <RelationshipGraph relationships={relationships} />
                {relationships.length === 0 && (
                  <p className="text-sm text-slate-500">
                    聊天中提及的人会自动出现在这里。
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles size={18} className="text-lumi-accent" />
                  记忆化身
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {avatar ? (
                  <>
                    <div className="rounded-lg bg-celestial-deep p-4">
                      <p className="text-sm text-slate-300">{avatar.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {avatar.values.map((value) => (
                        <span
                          key={value}
                          className="rounded-full bg-lumi-accent/10 px-3 py-1 text-sm text-lumi-accent"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium text-slate-300">语音风格：</span>{' '}
                      {avatar.voiceNotes}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    基于最近的记忆生成一个 distilled persona。
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateAvatar}
                    disabled={generating}
                    variant="secondary"
                  >
                    <Wand2 size={16} />
                    {generating ? '生成中' : '生成化身'}
                  </Button>
                  <Button
                    onClick={handleConsolidate}
                    disabled={consolidating}
                    variant="secondary"
                  >
                    <RefreshCw
                      size={16}
                      className={consolidating ? 'animate-spin' : ''}
                    />
                    {consolidating ? '整理中' : '整理记忆'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
