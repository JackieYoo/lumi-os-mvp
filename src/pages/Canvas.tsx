import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, LayoutDashboard, Sparkles } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { ConversationCanvas } from '../components/canvas/ConversationCanvas.js';
import { streamChat } from '../lib/api.js';
import { createUserInputNode, eventToCanvasNodes } from '../lib/canvasEvents.js';
import type { StreamEvent } from '../lib/canvasEvents.js';
import { Button } from '../components/ui/Button.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Card, CardContent } from '../components/ui/Card.js';
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
        <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="gap-1.5 text-text-tertiary hover:text-status-error">
          <Trash2 size={14} />
          清空
        </Button>
      }
    >
      <div className="flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-lumi-accent">
                <LayoutDashboard size={18} />
                <span className="text-sm font-medium">对话可视化</span>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">用画布看见 Lumi 的思考过程</h2>
              <p className="mt-1 text-sm text-text-tertiary">发送一条消息，观察工具调用、记忆检索与响应生成过程。</p>
            </div>
            <div className="rounded-xl border border-celestial-border bg-celestial-deep/40 px-4 py-2 text-sm text-text-secondary">
              当前节点：<span className="font-semibold text-text-primary">{nodes.length}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 overflow-hidden rounded-2xl border border-celestial-border bg-celestial-panel/40">
          <ConversationCanvas nodes={nodes} isStreaming={isStreaming} />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-end gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，查看 Lumi 的思考过程..."
                className="min-h-[70px] flex-1 resize-none"
                disabled={isStreaming}
              />
              <Button type="button" onClick={handleSend} disabled={!input.trim() || isStreaming} className="h-11 w-11 shrink-0 p-0">
                <Send size={18} />
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-text-tertiary">
              <Sparkles size={12} className="text-lumi-accent" />
              Enter 发送，Shift + Enter 换行
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
