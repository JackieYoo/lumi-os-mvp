import { useCallback, useState } from 'react';
import { Copy, Check, Mic, Sparkles } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { AudioVisualizer } from '../components/voice/AudioVisualizer.js';
import { VoiceCallButton } from '../components/voice/VoiceCallButton.js';
import { useVoice } from '../hooks/useVoice.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      disabled={!text}
      className="h-7 w-7 text-text-tertiary hover:text-lumi-accent"
      aria-label="复制"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </Button>
  );
}

export default function Voice() {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    setResponse('');
  }, []);

  const handleResponse = useCallback((text: string) => {
    setResponse(text);
  }, []);

  const { state, audioLevel, error, status, startRecording, stopRecording, cancel } = useVoice({
    onTranscript: handleTranscript,
    onResponse: handleResponse,
  });

  return (
    <AppLayout title="语音对话" sidebarProps={{}} actions={null}>
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto p-4 lg:p-6">
        <Card className="overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-bl from-lumi-accent/10 to-transparent" />
          <CardContent className="relative flex flex-col items-center gap-6 py-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lumi-accent/30 to-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/30">
                <Mic size={30} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Lumi Voice</h2>
                <p className="mt-1 text-sm text-text-tertiary">让 Lumi 用语音陪你对话</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <AudioVisualizer state={state} level={audioLevel} />
              {error && (
                <p className="max-w-md text-center text-sm text-status-error">
                  {error}
                  <button onClick={cancel} className="ml-2 underline hover:text-text-primary">
                    重置
                  </button>
                </p>
              )}
              {status && !status.stt && !error && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-300">
                  STT/TTS 服务未配置，将使用浏览器语音合成作为降级方案。
                </div>
              )}
            </div>

            <VoiceCallButton state={state} onStart={startRecording} onStop={stopRecording} disabled={!status} />
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>你的话语</CardTitle>
                  <CardDescription>实时语音转文字结果</CardDescription>
                </div>
                <CopyButton text={transcript} />
              </div>
            </CardHeader>
            <CardContent>
              <p aria-live="polite" className="min-h-[5rem] select-text whitespace-pre-wrap break-all text-text-secondary">
                {transcript || <span className="text-text-tertiary">点击按钮开始说话...</span>}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles size={16} className="text-lumi-accent" /> Lumi 回复
                  </CardTitle>
                  <CardDescription>生成后的回复文本</CardDescription>
                </div>
                <CopyButton text={response} />
              </div>
            </CardHeader>
            <CardContent>
              <p aria-live="polite" className="min-h-[5rem] max-h-64 select-text overflow-auto whitespace-pre-wrap break-all text-text-secondary">
                {response || <span className="text-text-tertiary">等待输入...</span>}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
