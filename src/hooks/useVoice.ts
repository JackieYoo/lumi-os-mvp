import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

export interface VoiceStatus {
  stt: boolean;
  tts: boolean;
}

interface UseVoiceOptions {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getToken = useCallback(() => localStorage.getItem('lumi_token') || '', []);

  const resetAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/status', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = (await response.json()) as { success: boolean; data: VoiceStatus };
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      setStatus({ stt: false, tts: false });
    }
  }, [getToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

  const playAudioBuffer = useCallback(async (buffer: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    try {
      const decoded = await audioContext.decodeAudioData(buffer);
      const source = audioContext.createBufferSource();
      source.buffer = decoded;
      source.connect(audioContext.destination);
      source.onended = () => {
        setState('idle');
      };
      setState('speaking');
      source.start(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio playback failed';
      setError(message);
      setState('error');
      options.onError?.(new Error(message));
    }
  }, [options]);

  const speakWithBrowserTTS = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) {
        const message = 'Browser TTS not supported';
        setError(message);
        setState('error');
        options.onError?.(new Error(message));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.onend = () => setState('idle');
      utterance.onerror = () => {
        setError('Browser TTS failed');
        setState('error');
      };

      setState('speaking');
      window.speechSynthesis.speak(utterance);
    },
    [options]
  );

  const sendToLLM = useCallback(
    async (text: string) => {
      setState('processing');
      options.onTranscript?.(text);

      try {
        const controller = resetAbortController();
        const settingsRaw = localStorage.getItem('lumi_settings');
        const settings = settingsRaw
          ? (JSON.parse(settingsRaw) as { provider?: string; model?: string })
          : {};

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            message: text,
            provider: settings.provider || 'openai',
            model: settings.model,
            enableMemory: true,
            enableTools: true,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `Chat failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const event = JSON.parse(data) as { type?: string; content?: string };
              if (event.type === 'delta' && event.content) {
                fullResponse += event.content;
              }
            } catch {
              // ignore malformed events
            }
          }
        }

        options.onResponse?.(fullResponse);

        if (status?.tts) {
          const ttsResponse = await fetch('/api/voice/tts', {
            method: 'POST',
            signal: abortControllerRef.current?.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ text: fullResponse }),
          });

          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer();
            await playAudioBuffer(audioBuffer);
          } else {
            speakWithBrowserTTS(fullResponse);
          }
        } else {
          speakWithBrowserTTS(fullResponse);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Voice processing failed';
        setError(message);
        setState('error');
        options.onError?.(new Error(message));
      }
    },
    [getToken, options, playAudioBuffer, speakWithBrowserTTS, status]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      if (!mimeType) {
        setError('当前浏览器不支持音频录制');
        setState('error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopAudioLevelMonitoring();
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length === 0) {
          setError('录音时长太短，没有捕获到音频');
          setState('error');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });

        if (audioBlob.size === 0) {
          setError('录音文件为空');
          setState('error');
          return;
        }

        // eslint-disable-next-line no-console
        console.log('[Voice] audio recorded', {
          mimeType: mediaRecorder.mimeType,
          size: audioBlob.size,
          chunks: audioChunksRef.current.length,
        });

        try {
          const response = await fetch('/api/voice/stt', {
            method: 'POST',
            signal: abortControllerRef.current?.signal,
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            body: (() => {
              const formData = new FormData();
              formData.append('audio', audioBlob, 'recording.webm');
              return formData;
            })(),
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error || `STT failed: ${response.status}`);
          }

          const result = (await response.json()) as { success: boolean; data: { text: string } };
          if (result.success && result.data.text) {
            await sendToLLM(result.data.text);
          } else {
            setError('未能识别到语音，请重试');
            setState('error');
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Speech recognition failed';
          setError(message);
          setState('error');
          options.onError?.(new Error(message));
        }
      };

      mediaRecorder.start();
      startAudioLevelMonitoring(stream);
      setState('recording');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone access denied';
      setError(message);
      setState('error');
      options.onError?.(new Error(message));
    }
  }, [getToken, options, sendToLLM, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    stopAudioLevelMonitoring();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState('idle');
    setAudioLevel(0);
    setError(null);
  }, [stopAudioLevelMonitoring]);

  useEffect(() => {
    return () => {
      cancel();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cancel]);

  return {
    state,
    audioLevel,
    error,
    status,
    startRecording,
    stopRecording,
    cancel,
  };
}
