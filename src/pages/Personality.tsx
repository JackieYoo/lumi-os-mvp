import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
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
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-4">
        {loading && (
          <p className="text-center text-sm text-slate-500">加载中…</p>
        )}

        {!loading && profile && (
          <>
            <Card className="border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles size={18} className="text-lumi-accent" />
                  人格雷达
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <PersonalityRadar vector={profile.vector} size={280} />
                <div className="grid w-full grid-cols-2 gap-2 text-sm">
                  {Object.entries(profile.vector).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-celestial-deep px-3 py-2"
                    >
                      <span className="text-slate-300">{key}</span>
                      <span className="font-mono font-medium text-lumi-accent">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">情绪状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">心情</span>
                    <span className="font-medium text-white">{profile.emotionalState.mood}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">效价</span>
                    <span className="font-medium text-white">
                      {profile.emotionalState.valence.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">唤醒</span>
                    <span className="font-medium text-white">
                      {profile.emotionalState.arousal.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">认知风格</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">思考 / 感受</span>
                    <span className="font-medium text-white">
                      {profile.cognitive.thinkingVsFeeling.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">直觉 / 实感</span>
                    <span className="font-medium text-white">
                      {profile.cognitive.intuitionVsSensing.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {profile.traits.length > 0 && (
              <Card className="border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">特质标签</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-lumi-accent/10 px-3 py-1 text-sm text-lumi-accent"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-700/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="text-sm text-slate-400">
                  基于聊天记录重新孵化初始人格
                </div>
                <Button
                  onClick={handleIncubate}
                  disabled={incubating}
                  variant="secondary"
                >
                  <RefreshCw
                    size={16}
                    className={incubating ? 'animate-spin' : ''}
                  />
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
