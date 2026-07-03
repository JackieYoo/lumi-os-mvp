import { useCallback, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { AudioVisualizer } from '../components/voice/AudioVisualizer.js';
import { VoiceCallButton } from '../components/voice/VoiceCallButton.js';
import { useVoice } from '../hooks/useVoice.js';
import { Card } from '../components/ui/Card.js';
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
      className="h-7 w-7 text-slate-500 hover:text-lumi-accent"
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
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <div className="flex flex-col items-center gap-4">
          <AudioVisualizer state={state} level={audioLevel} />
          {error && (
            <p className="max-w-md text-center text-sm text-red-400">
              {error}
              <button
                onClick={cancel}
                className="ml-2 text-slate-400 underline hover:text-white"
              >
                重置
              </button>
            </p>
          )}
          {status && !status.stt && !error && (
            <p className="max-w-md text-center text-sm text-amber-400">
              STT/TTS 服务未配置，将使用浏览器语音合成作为降级方案。
            </p>
          )}
        </div>

        <VoiceCallButton
          state={state}
          onStart={startRecording}
          onStop={stopRecording}
          disabled={!status}
        />

        <div className="grid w-full max-w-3xl gap-4 lg:grid-cols-2">
          <Card className="bg-celestial-panel/60 backdrop-blur">
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  你的话语
                </h3>
                <CopyButton text={transcript} />
              </div>
              <p
                aria-live="polite"
                className="min-h-[3rem] select-text whitespace-pre-wrap break-all text-slate-200"
              >
                {transcript || (
                  <span className="text-slate-500">点击按钮开始说话...</span>
                )}
              </p>
            </div>
          </Card>

          <Card className="bg-celestial-panel/60 backdrop-blur">
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Lumi 回复
                </h3>
                <CopyButton text={response} />
              </div>
              <p
                aria-live="polite"
                className="min-h-[3rem] max-h-64 select-text overflow-auto whitespace-pre-wrap break-all text-slate-200"
              >
                {response || (
                  <span className="text-slate-500">等待输入...</span>
                )}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
