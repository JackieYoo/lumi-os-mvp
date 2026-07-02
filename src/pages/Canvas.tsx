import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { ConversationCanvas } from '../components/canvas/ConversationCanvas.js';
import { streamChat } from '../lib/api.js';
import { createUserInputNode, eventToCanvasNodes } from '../lib/canvasEvents.js';
import type { StreamEvent } from '../lib/canvasEvents.js';
import { Button } from '../components/ui/Button.js';
import { Textarea } from '../components/ui/Textarea.js';
import type { CanvasNodeData } from '../types/canvas.js';

export default function Canvas() {
  const [input, setInput] = useState('');
  const [nodes, setNodes] = useState<CanvasNodeData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput('');
    setError(null);
    setIsStreaming(true);

    setNodes((prev) => [...prev, createUserInputNode(message)]);

    const settingsRaw = localStorage.getItem('lumi_settings');
    const settings = settingsRaw
      ? (JSON.parse(settingsRaw) as { provider?: string; model?: string })
      : {};

    try {
      await streamChat(
        {
          message,
          provider: settings.provider || 'openai',
          model: settings.model,
          enableMemory: true,
          enableTools: true,
        },
        (event) => {
          const newNodes = eventToCanvasNodes(message, event as StreamEvent);
          if (newNodes.length > 0) {
            setNodes((prev) => [...prev, ...newNodes]);
          }
        },
        () => {
          setIsStreaming(false);
        },
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canvas chat failed';
      setError(message);
      setIsStreaming(false);
    }
  }, [input, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearCanvas = () => {
    setNodes([]);
    setError(null);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <AppLayout
      title="Canvas 画布"
      sidebarProps={{}}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          className="gap-1.5 text-slate-400 hover:text-red-400"
        >
          <Trash2 size={14} />
          清空
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden">
          <ConversationCanvas nodes={nodes} isStreaming={isStreaming} />
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="border-t border-slate-700/50 bg-celestial-panel/60 p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，查看 Lumi 的思考过程..."
              className="min-h-[60px] flex-1 resize-none"
              disabled={isStreaming}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-10 w-10 shrink-0 p-0"
            >
              <Send size={18} />
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
