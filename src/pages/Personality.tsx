import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.js';
import { PersonalityRadar } from '../components/personality/PersonalityRadar.js';
import { apiRequest } from '../lib/api.js';
import { toast } from 'sonner';

interface PersonalityProfile {
  userId: string;
  vector: {
    warmth: number;
    curiosity: number;
    creativity: number;
    rationality: number;
    empathy: number;
    assertiveness: number;
    playfulness: number;
    depth: number;
  };
  emotionalState: {
    valence: number;
    arousal: number;
    mood: string;
  };
  cognitive: {
    thinkingVsFeeling: number;
    intuitionVsSensing: number;
  };
  traits: string[];
  updatedAt: string;
}

const traitLabels: Record<keyof PersonalityProfile['vector'], string> = {
  warmth: '温暖',
  curiosity: '好奇',
  creativity: '创造',
  rationality: '理性',
  empathy: '共情',
  assertiveness: '主动',
  playfulness: '活泼',
  depth: '深度',
};

export default function Personality() {
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [incubating, setIncubating] = useState(false);

  const load = async () => {
    try {
      const data = await apiRequest<PersonalityProfile>('GET', '/personality');
      setProfile(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleIncubate = async () => {
    setIncubating(true);
    try {
      const data = await apiRequest<PersonalityProfile>('POST', '/personality/incubate', {
        provider: 'openai',
      });
      setProfile(data);
      toast.success('人格已孵化');
    } catch {
      // handled
    } finally {
      setIncubating(false);
    }
  };

  return (
    <AppLayout title="人格引擎" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        {loading && (
          <p className="py-12 text-center text-sm text-text-tertiary">加载中…</p>
        )}

        {!loading && profile && (
          <>
            <Card className="overflow-hidden">
              <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-bl from-lumi-accent/10 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={18} className="text-lumi-accent" /> 人格画像
                </CardTitle>
                <CardDescription>基于对话自动进化的八维人格模型</CardDescription>
              </CardHeader>
              <CardContent className="relative flex flex-col items-center gap-6">
                <PersonalityRadar vector={profile.vector} size={300} />
                <div className="grid w-full grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  {Object.entries(profile.vector).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col rounded-xl border border-celestial-border bg-celestial-deep/40 px-3 py-2.5"
                    >
                      <span className="text-xs text-text-tertiary">{traitLabels[key as keyof PersonalityProfile['vector']]}</span>
                      <span className="font-mono text-lg font-semibold text-lumi-accent">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>情绪状态</CardTitle>
                  <CardDescription>当前情绪维度快照</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="心情" value={profile.emotionalState.mood} />
                  <StatRow label="效价" value={profile.emotionalState.valence.toFixed(2)} />
                  <StatRow label="唤醒" value={profile.emotionalState.arousal.toFixed(2)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>认知风格</CardTitle>
                  <CardDescription>思维与感知偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="思考 / 感受" value={profile.cognitive.thinkingVsFeeling.toFixed(2)} />
                  <StatRow label="直觉 / 实感" value={profile.cognitive.intuitionVsSensing.toFixed(2)} />
                </CardContent>
              </Card>
            </div>

            {profile.traits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>特质标签</CardTitle>
                  <CardDescription>从对话中提炼出的稳定特质</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-lumi-accent/10 px-3 py-1 text-sm font-medium text-lumi-accent-soft ring-1 ring-lumi-accent/20"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
                <div>
                  <p className="text-sm font-medium text-text-primary">重新孵化人格</p>
                  <p className="text-xs text-text-tertiary">基于聊天记录重新初始化初始人格画像</p>
                </div>
                <Button onClick={handleIncubate} disabled={incubating} variant="secondary">
                  <RefreshCw size={16} className={incubating ? 'animate-spin' : ''} />
                  {incubating ? '孵化中' : '重新孵化'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-celestial-border bg-celestial-deep/40 px-3 py-2.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
